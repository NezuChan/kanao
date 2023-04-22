/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import EventEmitter from "node:events";
import { createLogger } from "../Utilities/Logger.js";
import { clientId, discordToken, gatewayGuildPerShard, gatewayHandShakeTimeout, gatewayHelloTimeout, gatewayIntents, gatewayLargeThreshold, gatewayPresenceName, gatewayPresenceType, gatewayReadyTimeout, gatewayResume, gatewayShardCount, gatewayShardIds, gatewayShardsPerWorkers, lokiHost, proxy, replicaCount, replicaId, storeLogs } from "../config.js";
import { REST } from "@discordjs/rest";
import { CompressionMethod, SessionInfo, WebSocketManager, WebSocketShardStatus } from "@discordjs/ws";
import { PresenceUpdateStatus } from "discord-api-types/v10";
import { Util } from "@nezuchan/utilities";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessShardingStrategy } from "../Utilities/WebSockets/ProcessShardingStrategy.js";
import { Result } from "@sapphire/result";
import { createRedis } from "../Utilities/CreateRedis.js";
import { createAmqpChannel } from "../Utilities/CreateAmqpChannel.js";
import { RoutingKey } from "../Utilities/RoutingKey.js";
import { Time } from "@sapphire/time-utilities";
import { Channel } from "amqplib";

const packageJson = Util.loadJSON<{ version: string }>(`file://${join(fileURLToPath(import.meta.url), "../../../package.json")}`);

export class NezuGateway extends EventEmitter {
    public rest = new REST({ api: proxy, rejectOnRateLimit: proxy === "https://discord.com/api" ? null : () => false });
    public logger = createLogger("nezu-gateway", clientId, storeLogs, lokiHost);

    public redis = createRedis();

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
        shardIds: gatewayShardIds,
        initialPresence: {
            activities: [
                {
                    name: gatewayPresenceName ?? `NezukoChan Gateway v${packageJson.version}`,
                    type: gatewayPresenceType
                }
            ],
            since: Date.now(),
            status: PresenceUpdateStatus.Online,
            afk: false
        },
        updateSessionInfo: async (shardId: number, sessionInfo: SessionInfo) => {
            const result = await Result.fromAsync(() => this.redis.set(`${clientId}:gateway_shard_session:${shardId}`, JSON.stringify(sessionInfo)));
            if (result.isOk()) return;
            this.logger.error(result.unwrapErr(), "Failed to update session info");
        },
        retrieveSessionInfo: async (shardId: number) => {
            if (gatewayResume) {
                const result = await Result.fromAsync(() => this.redis.get(`${clientId}:gateway_shard_session:${shardId}`));
                const sessionInfo = result.isOk() ? result.unwrap() : null;
                if (sessionInfo) return JSON.parse(sessionInfo) as SessionInfo;
                if (result.isErr()) this.logger.error(result.unwrapErr(), "Failed to retrieve session info");
            }
            return null;
        },
        compression: CompressionMethod.ZlibStream,
        rest: this.rest
    });

    public constructor() {
        super();
        this.rest.setToken(discordToken);
    }

    public async connect(): Promise<void> {
        await this.setupAmqp();

        if (gatewayGuildPerShard) {
            const { shards } = await this.ws.fetchGatewayInformation(true);
            this.ws.options.shardCount = Number(Math.ceil((shards * (1_000 / Number(gatewayGuildPerShard))) / 1));
        }

        await this.ws.connect();
        const shardCount = await this.ws.getShardCount();

        let shardId = -1;
        while (shardId < (shardCount - 1)) {
            shardId += 1; await this.redis.set(`${clientId}:gateway_shard_status:${shardId}`, JSON.stringify({ latency: -1, status: WebSocketShardStatus.Connecting }));
        }

        await this.redis.set(`${clientId}:gateway_shard_count`, shardCount);
    }

    public async setupAmqp() {
        const amqp = await createAmqpChannel();

        await amqp.assertQueue("nezu-gateway.stats", { durable: false });
        await amqp.assertExchange("nezu-gateway.stats", "direct", { durable: false });

        const { queue } = await amqp.assertQueue("", { exclusive: true });
        await amqp.bindQueue(queue, "nezu-gateway.stats", RoutingKey(replicaId));

        await amqp.consume(queue, async message => {
            if (message) {
                const content = JSON.parse(message.content.toString()) as { route: string };
                const stats = [];
                for (const [shardId, status] of await this.ws.fetchStatus()) {
                    const latency = await this.redis.get(`${clientId}:gateway_shard_latency:${shardId}`);
                    stats.push({ shardId, status, latency: latency ? Number(latency) : -1 });
                }

                amqp.publish("nezu-gateway.stats_pooler", content.route, Buffer.from(
                    JSON.stringify(stats)
                ));
            }
        });

        await amqp.consume("nezu-gateway.stats", async message => {
            if (message) {
                const stats = await this.resolveStats(amqp);
                amqp.sendToQueue(message.properties.replyTo, Buffer.from(JSON.stringify(stats)), {
                    correlationId: message.properties.correlationId
                });
                amqp.ack(message);
            }
        });
    }

    public async resolveStats(channel: Channel) {
        await channel.assertExchange("nezu-gateway.stats_pooler", "direct", { durable: false });
        const { queue } = await channel.assertQueue("", { exclusive: true });
        await channel.bindQueue(queue, "nezu-gateway.stats_pooler", RoutingKey(replicaId));

        for (let i = 0; i < replicaCount; i += 1) {
            channel.publish("nezu-gateway.stats", RoutingKey(i), Buffer.from(JSON.stringify({ route: RoutingKey(replicaId) })));
        }

        return new Promise(resolve => {
            const timeout = setTimeout(() => resolve([]), Time.Second * 15);
            const stats: Stats[] = [];

            return channel.consume(queue, message => {
                if (message) {
                    const content = JSON.parse(message.content.toString()) as Stats[];
                    for (const stat of content) {
                        stats.push(stat);
                    }

                    channel.ack(message);
                }

                if (stats.length === replicaCount) {
                    clearTimeout(timeout);
                    return resolve(stats);
                }
            });
        });
    }
}

interface Stats {
    shardId: number;
    status: WebSocketShardStatus;
    latency: number;
}
