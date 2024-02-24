/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { Buffer } from "node:buffer";
import EventEmitter from "node:events";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { REST } from "@discordjs/rest";
import { CompressionMethod, WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import type { SessionInfo, ShardRange } from "@discordjs/ws";
import { GatewayExchangeRoutes, RabbitMQ } from "@nezuchan/constants";
import { RoutedQueue, Util, createAmqpChannel } from "@nezuchan/utilities";
import type { Channel } from "amqplib";
import Database from "better-sqlite3";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import APM from "prometheus-middleware";
import { createLogger } from "../Utilities/Logger.js";
import { ProcessShardingStrategy } from "../Utilities/WebSockets/ProcessShardingStrategy.js";
import { amqp, clientId, discordToken, enablePrometheus, gatewayCompression, gatewayGuildPerShard, gatewayHandShakeTimeout, gatewayHelloTimeout, gatewayIntents, gatewayLargeThreshold, gatewayPresenceName, gatewayPresenceStatus, gatewayPresenceType, gatewayReadyTimeout, gatewayResume, gatewayShardCount, gatewayShardsPerWorkers, getShardCount, lokiHost, prometheusPath, prometheusPort, proxy, replicaId, storeLogs } from "../config.js";
import * as schema from "./DatabaseSchema.js";

const packageJson = Util.loadJSON<{ version: string; }>(`file://${join(fileURLToPath(import.meta.url), "../../../package.json")}`);
const shardIds = await getShardCount();

export class NezuGateway extends EventEmitter {
    public rest = new REST({ api: proxy, rejectOnRateLimit: proxy === "https://discord.com/api" ? null : () => false });
    public logger = createLogger("kanao-gateway", clientId, storeLogs, lokiHost);

    public database = new Database(join(process.cwd(), "storage", "kanao-gateway.db"), { timeout: 30_000 });
    public drizzle = drizzle(this.database, { schema });

    public prometheus = new APM({
        PORT: prometheusPort,
        METRICS_ROUTE: prometheusPath
    });

    public ws = new WebSocketManager({
        buildStrategy: (manager: WebSocketManager) => new ProcessShardingStrategy(manager, {
            shardsPerWorker: gatewayShardsPerWorkers
        }),
        intents: gatewayIntents,
        helloTimeout: gatewayHelloTimeout,
        readyTimeout: gatewayReadyTimeout,
        handshakeTimeout: gatewayHandShakeTimeout,
        largeThreshold: gatewayLargeThreshold,
        token: discordToken,
        shardCount: gatewayShardCount,
        shardIds: shardIds as ShardRange,
        initialPresence: {
            activities: [
                {
                    name: gatewayPresenceName ?? `Kanao Gateway v${packageJson.version}`,
                    type: gatewayPresenceType
                }
            ],
            since: gatewayPresenceStatus === "idle" ? Date.now() : null,
            status: gatewayPresenceStatus,
            afk: false
        },
        updateSessionInfo: async (shardId: number, sessionInfo: SessionInfo | null) => {
            await (gatewayResume && sessionInfo !== null
                ? this.drizzle.insert(schema.sessions).values({
                    id: shardId,
                    resumeURL: sessionInfo.resumeURL,
                    sequence: sessionInfo.sequence,
                    sessionId: sessionInfo.sessionId,
                    shardCount: sessionInfo.shardCount
                }).onConflictDoUpdate({
                    target: schema.sessions.id,
                    set: {
                        resumeURL: sql`EXCLUDED.resume_url`,
                        sequence: sql`EXCLUDED.sequence`,
                        sessionId: sql`EXCLUDED.session_id`,
                        shardCount: sql`EXCLUDED.shardCount`
                    },
                    where: eq(schema.sessions.id, shardId)
                })
                : this.drizzle.delete(schema.sessions).where(eq(schema.sessions.id, shardId)));
        },
        retrieveSessionInfo: async (shardId: number) => {
            if (gatewayResume) {
                const session = await this.drizzle.query.sessions.findFirst({
                    where: () => eq(schema.sessions.id, shardId)
                });

                if (session !== undefined) {
                    return {
                        resumeURL: session.resumeURL,
                        sequence: session.sequence,
                        sessionId: session.sessionId,
                        shardCount: session.shardCount,
                        shardId: session.id
                    };
                }
            }
            return null;
        },
        compression: gatewayCompression ? CompressionMethod.ZlibStream : null,
        rest: this.rest
    });

    public constructor() {
        super();
        this.rest.setToken(discordToken);
    }

    public async connect(): Promise<void> {
        this.setupAmqp();

        await this.database.pragma("journal_mode = WAL");
        migrate(this.drizzle, { migrationsFolder: "dist/drizzle" });

        if (enablePrometheus) this.setupPrometheus();

        this.ws.on(WebSocketShardEvents.Debug, ({ message }) => this.logger.debug(message));

        if (gatewayGuildPerShard && gatewayShardCount === null) {
            const { shards } = await this.ws.fetchGatewayInformation(true);
            this.ws.options.shardCount = Number(Math.ceil((shards * (1_000 / Number(gatewayGuildPerShard))) / 1));
        }

        await this.ws.connect();
    }

    public setupAmqp(): void {
        const amqpChannel = createAmqpChannel(amqp, {
            setup: async (channel: Channel) => {
                await channel.assertExchange(RabbitMQ.GATEWAY_EXCHANGE, "topic", { durable: false });

                // Used for Stats RPC
                const rpc = new RoutedQueue(`${GatewayExchangeRoutes.REQUEST}.stats`, clientId, `gateway-rpc-${replicaId}`);
                await channel.assertQueue(rpc.queue, { durable: false, autoDelete: true });
                await channel.bindQueue(rpc.queue, RabbitMQ.GATEWAY_EXCHANGE, rpc.key);

                await channel.consume(rpc.queue, async message => {
                    if (message) {
                        const content = JSON.parse(message.content.toString()) as { replyTo: string; };
                        const stats = [];
                        for (const [shardId, status] of await this.ws.fetchStatus()) {
                            const stat = await this.drizzle.query.status.findFirst({
                                where: () => eq(schema.status.shardId, shardId)
                            });
                            stats.push({ shardId, status, latency: stat?.latency ?? -1 });
                        }
                        channel.ack(message);
                        await amqpChannel.sendToQueue(content.replyTo, Buffer.from(
                            JSON.stringify({
                                request: rpc.key,
                                shards: stats,
                                replicaId,
                                clientId,
                                memoryUsage: process.memoryUsage(),
                                cpuUsage: process.cpuUsage(),
                                uptime: process.uptime(),
                                shardCount: stats.length
                            })
                        ), {
                            correlationId: message.properties.correlationId as string
                        });
                    }
                });
            }
        });

        amqpChannel.on("error", err => this.logger.error(err, "AMQP Channel on main process Error"));
        amqpChannel.on("close", () => this.logger.warn("AMQP Channel on main process Closed"));
        amqpChannel.on("connect", () => this.logger.info("AMQP Channel handler on main process connected"));
    }

    public setupPrometheus(): void {
        this.prometheus.init();
        this.prometheus.client.register.setDefaultLabels({ replicaId, clientId });

        this.logger.info("Prometheus initialized");
    }
}
