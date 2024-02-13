/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import EventEmitter from "node:events";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { REST } from "@discordjs/rest";
import { CompressionMethod, WebSocketManager, WebSocketShardEvents, WebSocketShardStatus } from "@discordjs/ws";
import type { SessionInfo, ShardRange } from "@discordjs/ws";
import { RabbitMQ } from "@nezuchan/constants";
import * as schema from "@nezuchan/kanao-schema";
import { Util, createAmqpChannel, RoutingKey } from "@nezuchan/utilities";
import type { Channel } from "amqplib";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import APM from "prometheus-middleware";
import { createLogger } from "../Utilities/Logger.js";
import { ProcessShardingStrategy } from "../Utilities/WebSockets/ProcessShardingStrategy.js";
import { amqp, clientId, databaseUrl, discordToken, enablePrometheus, gatewayCompression, gatewayGuildPerShard, gatewayHandShakeTimeout, gatewayHelloTimeout, gatewayIntents, gatewayLargeThreshold, gatewayPresenceName, gatewayPresenceStatus, gatewayPresenceType, gatewayReadyTimeout, gatewayResume, gatewayShardCount, gatewayShardsPerWorkers, getShardCount, lokiHost, prometheusPath, prometheusPort, proxy, replicaId, storeLogs } from "../config.js";

const packageJson = Util.loadJSON<{ version: string; }>(`file://${join(fileURLToPath(import.meta.url), "../../../package.json")}`);
const shardIds = await getShardCount();

export class NezuGateway extends EventEmitter {
    public rest = new REST({ api: proxy, rejectOnRateLimit: proxy === "https://discord.com/api" ? null : () => false });
    public logger = createLogger("nezu-gateway", clientId, storeLogs, lokiHost);

    public drizzle = drizzle(postgres(databaseUrl), { schema });

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
                    name: gatewayPresenceName ?? `NezukoChan Gateway v${packageJson.version}`,
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
                        resumeURL: sessionInfo.resumeURL,
                        sequence: sessionInfo.sequence,
                        sessionId: sessionInfo.sessionId,
                        shardCount: sessionInfo.shardCount
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
        if (enablePrometheus) this.setupPrometheus();

        this.ws.on(WebSocketShardEvents.Debug, ({ message }) => this.logger.debug(message));

        if (gatewayGuildPerShard && gatewayShardCount === null) {
            const { shards } = await this.ws.fetchGatewayInformation(true);
            this.ws.options.shardCount = Number(Math.ceil((shards * (1_000 / Number(gatewayGuildPerShard))) / 1));
        }

        await this.ws.connect();
        const shardCount = await this.ws.getShardCount();

        // When multiple replica is running, only reset few shards statuses
        const shardStart = shardIds?.start ?? 0;
        const shardEnd = shardIds?.end ?? shardCount;

        for (let i = shardStart; i < shardEnd; i++) {
            await this.drizzle.insert(schema.status).values({
                shardId: i,
                latency: -1,
                lastAck: Date.now().toString(),
                status: WebSocketShardStatus.Connecting
            }).onConflictDoUpdate({
                target: schema.status.shardId,
                set: {
                    latency: -1,
                    lastAck: Date.now().toString(),
                    status: WebSocketShardStatus.Connecting
                }
            });
        }
    }

    public setupAmqp(): void {
        const amqpChannel = createAmqpChannel(amqp, {
            setup: async (channel: Channel) => {
                await channel.assertExchange(RabbitMQ.GATEWAY_QUEUE_STATS, "topic", { durable: false });

                const { queue } = await channel.assertQueue("", { exclusive: true });

                for (const route of [RoutingKey(clientId, "*"), RoutingKey(clientId, replicaId)]) {
                    await channel.bindQueue(queue, RabbitMQ.GATEWAY_QUEUE_STATS, route);
                }

                // TODO [2024-02-20]: Implement this
                // await channel.consume(queue, async message => {
                //     if (!message) return;
                //     const content = JSON.parse(message.content.toString()) as { route: string; };
                //     const stats = [];
                //     for (const [shardId, status] of await this.ws.fetchStatus()) {
                //         const raw_value = await this.redis.get(GenKey(RedisKey.STATUSES_KEY, shardId.toString()));
                //         const shard_status = raw_value === null ? { latency: -1 } : JSON.parse(raw_value) as { latency: number; };
                //         stats.push({ shardId, status, latency: shard_status.latency });
                //     }
                //     const guildCount = await this.redis.get(GenKey(RedisKey.GUILD_KEY, RedisKey.COUNT))
                //         .then(c => (c === null ? 0 : Number(c)));
                //     channel.ack(message);
                //     await amqpChannel.publish(RabbitMQ.GATEWAY_QUEUE_STATS, content.route, Buffer.from(
                //         JSON.stringify({
                //             shards: stats,
                //             replicaId,
                //             clientId,
                //             memoryUsage: process.memoryUsage(),
                //             cpuUsage: process.cpuUsage(),
                //             uptime: process.uptime(),
                //             shardCount: stats.length,
                //             guildCount
                //         })
                //     ), {
                //         correlationId: message.properties.correlationId as string
                //     });
                // });
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