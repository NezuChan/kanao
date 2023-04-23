/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import EventEmitter from "node:events";
import { createLogger } from "../Utilities/Logger.js";
import { amqp, clientId, discordToken, enablePrometheus, gatewayGuildPerShard, gatewayHandShakeTimeout, gatewayHelloTimeout, gatewayIntents, gatewayLargeThreshold, gatewayPresenceName, gatewayPresenceType, gatewayReadyTimeout, gatewayResume, gatewayShardCount, gatewayShardIds, gatewayShardsPerWorkers, lokiHost, prometheusPath, prometheusPort, proxy, redisClusterScaleReads, redisClusters, redisDb, redisHost, redisNatMap, redisPassword, redisPort, redisUsername, replicaCount, replicaId, storeLogs } from "../config.js";
import { REST } from "@discordjs/rest";
import { CompressionMethod, SessionInfo, WebSocketManager, WebSocketShardStatus } from "@discordjs/ws";
import { PresenceUpdateStatus } from "discord-api-types/v10";
import { Util, createAmqpChannel, createRedis, RoutingKey } from "@nezuchan/utilities";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessShardingStrategy } from "../Utilities/WebSockets/ProcessShardingStrategy.js";
import { Result } from "@sapphire/result";
import { Time } from "@sapphire/time-utilities";
import { Channel } from "amqplib";
import APM from "prometheus-middleware";
import { GenKey } from "../Utilities/GenKey.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";

const packageJson = Util.loadJSON<{ version: string }>(`file://${join(fileURLToPath(import.meta.url), "../../../package.json")}`);

export class NezuGateway extends EventEmitter {
    public rest = new REST({ api: proxy, rejectOnRateLimit: proxy === "https://discord.com/api" ? null : () => false });
    public logger = createLogger("nezu-gateway", clientId, storeLogs, lokiHost);

    public redis = createRedis({
        redisUsername,
        redisPassword,
        redisHost,
        redisPort,
        redisDb,
        redisClusterScaleReads,
        redisClusters,
        redisNatMap
    });

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

        if (enablePrometheus) this.setupPrometheus();

        if (gatewayGuildPerShard) {
            const { shards } = await this.ws.fetchGatewayInformation(true);
            this.ws.options.shardCount = Number(Math.ceil((shards * (1_000 / Number(gatewayGuildPerShard))) / 1));
        }

        await this.ws.connect();
        const shardCount = await this.ws.getShardCount();

        for (let i = 0; i < shardCount; i++) {
            await this.redis.set(`${clientId}:gateway_shard_status:${i}`, JSON.stringify({ latency: -1, status: WebSocketShardStatus.Connecting }));
        }

        await this.redis.set(`${clientId}:gateway_shard_count`, shardCount);
    }

    public async setupAmqp() {
        const amqpChannel = await createAmqpChannel(amqp);

        await amqpChannel.assertQueue(RabbitMQ.GATEWAY_QUEUE_STATS, { durable: false });
        await amqpChannel.assertExchange(RabbitMQ.GATEWAY_QUEUE_STATS, "topic", { durable: false });

        const { queue } = await amqpChannel.assertQueue("", { exclusive: true });
        await amqpChannel.bindQueue(queue, RabbitMQ.GATEWAY_QUEUE_STATS, "*");

        await amqpChannel.consume(queue, async message => {
            if (message) {
                const content = JSON.parse(message.content.toString()) as { route: string };
                const stats = [];
                for (const [shardId, status] of await this.ws.fetchStatus()) {
                    const raw_value = await this.redis.get(`${clientId}:gateway_shard_status:${shardId}`);
                    const shard_status = raw_value ? JSON.parse(raw_value) as { latency: number } : { latency: -1 };
                    stats.push({ shardId, status, latency: shard_status.latency });
                }

                amqpChannel.publish(RabbitMQ.GATEWAY_QUEUE_STATS_POOLER, content.route, Buffer.from(
                    JSON.stringify(stats)
                ));
            }
        });

        await amqpChannel.consume("nezu-gateway.stats", async message => {
            if (message) {
                const stats = await this.resolveStats(amqpChannel);
                amqpChannel.sendToQueue(message.properties.replyTo, Buffer.from(JSON.stringify(stats)), {
                    correlationId: message.properties.correlationId
                });
                amqpChannel.ack(message);
            }
        });
    }

    public async resolveStats(channel: Channel) {
        await channel.assertExchange(RabbitMQ.GATEWAY_QUEUE_STATS_POOLER, "direct", { durable: false });
        const { queue } = await channel.assertQueue("", { exclusive: true });
        await channel.bindQueue(queue, RabbitMQ.GATEWAY_QUEUE_STATS_POOLER, RoutingKey(clientId, replicaId));

        channel.publish(RabbitMQ.GATEWAY_QUEUE_STATS, "*", Buffer.from(JSON.stringify({ route: RoutingKey(clientId, replicaId) })));

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

    public setupPrometheus() {
        this.prometheus.init();
        this.logger.info("Prometheus initialized");

        const guildCounter = new this.prometheus.client.Counter({
            name: "guild_count",
            help: "Guild count"
        });

        const channelCounter = new this.prometheus.client.Counter({
            name: "channel_count",
            help: "Channel count"
        });

        const socketCounter = new this.prometheus.client.Gauge({
            name: "ws_ping",
            help: "Websocket ping",
            labelNames: ["shardId"]
        });

        const sockerStatusCounter = new this.prometheus.client.Gauge({
            name: "ws_status",
            help: "Websocket status",
            labelNames: ["shardId"]
        });

        const userCounter = new this.prometheus.client.Counter({
            name: "user_count",
            help: "User count"
        });

        setInterval(async () => {
            guildCounter.reset();
            const guild = await this.redis.scard(GenKey(`${RedisKey.GUILD_KEY}${RedisKey.KEYS_SUFFIX}`));
            guildCounter.inc(guild);

            channelCounter.reset();
            const channel = await this.redis.scard(GenKey(`${RedisKey.CHANNEL_KEY}${RedisKey.KEYS_SUFFIX}`));
            channelCounter.inc(channel);

            userCounter.reset();
            const user = await this.redis.scard(GenKey(`${RedisKey.USER_KEY}${RedisKey.KEYS_SUFFIX}`));
            userCounter.inc(user);

            const shards_statuses = await this.ws.fetchStatus();

            for (const [shardId, socket] of shards_statuses) {
                sockerStatusCounter.set({ shardId }, socket);
                const status = await this.redis.get(`${clientId}:gateway_shard_status:${shardId}`);
                if (status) {
                    const { latency } = JSON.parse(status) as { latency: number };
                    socketCounter.set({ shardId }, latency);
                }
            }
            this.logger.debug("Updated prometheus metrics");
        }, Time.Second * 10);
    }
}

interface Stats {
    shardId: number;
    status: WebSocketShardStatus;
    latency: number;
}
