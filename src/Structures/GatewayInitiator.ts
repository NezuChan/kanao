/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable class-methods-use-this */
import gradient from "gradient-string";
import { default as IORedis } from "ioredis";
import { WebSocketManager, CompressionMethod, SessionInfo, WebSocketShardEvents } from "@discordjs/ws";
import { ProcessShardingStrategy } from "../Utilities/Websocket/ProcessShardingStrategy.js";
import { GatewaySendPayload } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { Result } from "@sapphire/result";
import { Util } from "../Utilities/Util.js";
import { createBanner } from "@skyra/start-banner";
import { RedisCollection } from "@nezuchan/redis-collection";
import { PresenceUpdateStatus } from "discord-api-types/payloads";
import APM from "prometheus-middleware";
import { RpcPublisher, RoutingSubscriber, createAmqp } from "@nezuchan/cordis-brokers";
import { Piece, Store, StoreRegistry, container } from "@sapphire/pieces";
import { TaskStore } from "../Stores/TaskStore.js";
import { createLogger } from "../Utilities/Logger.js";
import { RedisKey, RabbitMQ } from "@nezuchan/constants";
import { amqp, discordToken, enablePrometheus, gatewayGuildPerShard, gatewayHandShakeTimeout, gatewayHelloTimeout, gatewayIntents, gatewayLargeThreshold, gatewayPresenceName, gatewayPresenceType, gatewayReadyTimeout, gatewayShardCount, gatewayShardIds, gatewayShardsPerWorkers, lokiHost, prometheusPath, prometheusPort, proxy, redisClusterScaleReads, redisClusters, redisDb, redisHost, redisNatMap, redisPassword, redisPort, redisUsername, storeLogs, useRouting } from "../config.js";

const { default: Redis, Cluster } = IORedis;
const packageJson = Util.loadJSON<{ version: string }>("../../package.json");

export class GatewayInitiator {
    public prometheus = new APM({
        PORT: prometheusPort,
        METRICS_ROUTE: prometheusPath
    });

    public rest = new REST({
        api: proxy,
        rejectOnRateLimit: proxy === "https://discord.com/api" ? null : () => false
    });

    public redis =
        redisClusters.length
            ? new Cluster(
                redisClusters,
                {
                    scaleReads: redisClusterScaleReads,
                    redisOptions: {
                        password: redisPassword,
                        username: redisUsername,
                        db: redisDb
                    },
                    natMap: redisNatMap
                }
            )
            : new Redis({
                username: redisPassword,
                password: redisPassword,
                host: redisHost,
                port: redisPort,
                db: redisDb,
                natMap: redisNatMap
            });

    public clientId = Buffer.from(discordToken!.split(".")[0], "base64").toString();

    public logger = createLogger("nezu-gateway", this.clientId, storeLogs, lokiHost ? new URL(lokiHost) : undefined);

    public ws = new WebSocketManager({
        buildStrategy: (manager: WebSocketManager) => new ProcessShardingStrategy(manager, {
            shardsPerWorker: gatewayShardsPerWorkers
        }),
        intents: gatewayIntents,
        helloTimeout: gatewayHelloTimeout,
        readyTimeout: gatewayReadyTimeout,
        handshakeTimeout: gatewayHandShakeTimeout,
        largeThreshold: gatewayLargeThreshold,
        token: discordToken!,
        shardCount: gatewayShardCount,
        shardIds: gatewayShardIds,
        initialPresence: {
            activities: [
                {
                    name: gatewayPresenceName ?? `NezukoChan Gateway ${packageJson.version}`,
                    type: gatewayPresenceType
                }
            ],
            since: Date.now(),
            status: PresenceUpdateStatus.Online,
            afk: false
        },
        compression: CompressionMethod.ZlibStream,
        rest: this.rest,
        updateSessionInfo: async (shardId: number, sessionInfo: SessionInfo | null) => {
            if (sessionInfo) {
                const result = await Result.fromAsync(() => this.cache.sessions.set(`${shardId}`, sessionInfo));

                if (result.isErr()) this.logger.error(result.unwrapErr(), "Failed to update session info");
            }
        },
        retrieveSessionInfo: async (shardId: number) => {
            const result = await Result.fromAsync(() => this.cache.sessions.get(`${shardId}`));
            if (result.isErr()) return null;
            const sessionInfo = result.unwrap();
            await this.cache.sessions.delete(`${shardId}`);
            return sessionInfo ? sessionInfo : null;
        }
    });

    public stores = new StoreRegistry();

    public tasks!: {
        sender: RpcPublisher<string, Record<string, any>>;
        receiver: RoutingSubscriber<string, Record<string, any>>;
    };

    public amqp!: {
        receiver: RoutingSubscriber<string, Record<string, any>>;
    };

    public cache = {
        sessions: new RedisCollection<SessionInfo, SessionInfo>({ redis: this.redis, hash: Util.genKey(RedisKey.SESSIONS_KEY, this.clientId, false) }),
        statuses: new RedisCollection({ redis: this.redis, hash: Util.genKey(RedisKey.STATUSES_KEY, this.clientId, false) })
    };

    public date(): string {
        return Util.formatDate(Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour12: false
        }));
    }

    public async connect() {
        if (enablePrometheus) this.prometheus.init();
        const { channel } = await createAmqp(amqp!);

        this.tasks = {
            sender: new RpcPublisher(channel),
            receiver: new RoutingSubscriber(channel)
        };

        this.amqp = {
            receiver: new RoutingSubscriber(channel)
        };

        if (useRouting) {
            await this.amqp.receiver.init({ name: RabbitMQ.GATEWAY_QUEUE_SEND, useExchangeBinding: true, keys: this.clientId, durable: true });
        } else {
            await this.amqp.receiver.init({ queue: RabbitMQ.GATEWAY_QUEUE_SEND, keys: "*", durable: true });
        }

        await this.tasks.receiver.init({ name: RabbitMQ.TASKS_RECV, keys: "*", durable: true, exchangeType: "topic", useExchangeBinding: true });
        await this.tasks.sender.init({ name: RabbitMQ.TASKS_SEND, autoAck: true });

        container.tasks = this.tasks;
        container.prometheus = this.prometheus;
        container.ws = this.ws;
        container.clientId = this.clientId;
        container.redis = this.redis;
        container.logger = this.logger;

        this.stores.register(new TaskStore());
        this.rest.setToken(discordToken!);
        await Promise.all([...this.stores.values()].map((store: Store<Piece>) => store.loadAll()));

        const gatewaySessions = await this.cache.sessions.size;
        if (gatewaySessions && !useRouting) {
            this.logger.info(`Found ${gatewaySessions} resumeable gateway sessions in Redis`);
        } else if (useRouting) {
            this.logger.info("Starting in routing mode, clearing all non routed data from Redis");
            await this.clearCaches(false);
            this.logger.warn("Cleared up existing cache collections, switched to routing mode");
        } else {
            this.logger.warn("No gateway sessions found in Redis, starting fresh");
            await this.clearCaches(useRouting);
            this.logger.warn("Cleared up existing cache collections");
        }

        if (gatewayGuildPerShard) {
            const { shards } = await this.ws.fetchGatewayInformation(true);
            this.ws.options.shardCount = Number(Math.ceil((shards * (1_000 / Number(gatewayGuildPerShard))) / 1));
        }

        await this.ws.connect();
        const shardCount = await this.ws.getShardCount();
        await this.cache.statuses.clear();
        let shardId = -1;
        while (shardId < (shardCount - 1)) {
            shardId += 1; await this.cache.statuses.set(`${shardId}`, { shardId, ping: -1, latency: -1 });
        }
        await this.redis.set(Util.genKey(RedisKey.SHARDS_KEY, this.clientId, false), shardCount);

        this.amqp.receiver.on("send", (payload: {
            type: string;
            data: {
                op: number;
                shard: number;
                data: GatewaySendPayload;
            };
        }) => {
            switch (payload.data.op) {
                case 0:
                    void Result.fromAsync(() => this.ws.send(payload.data.shard, payload.data.data));
                    break;
                default:
                    this.logger.warn(`Unknown OP Code: ${payload.data.op}`);
                    break;
            }
        });

        this.ws.on(WebSocketShardEvents.Debug, (payload: { message: string; shardId: number }) => this.logger.debug(payload));
        this.ws.on(WebSocketShardEvents.Resumed, (payload: { shardId: number }) => this.logger.info(`Shard ${payload.shardId} Resumed`));
        this.ws.on(WebSocketShardEvents.Error, (payload: { error: Error; shardId: number }) => this.logger.error(payload.error, `Shard ${payload.shardId} threw an error`));

        this.ws.on(WebSocketShardEvents.HeartbeatComplete, async (payload: { shardId: number; latency: number }) => {
            await this.cache.statuses.set(`${payload.shardId}`, { ping: payload.latency, latency: payload.latency, shardId: payload.shardId });
        });

        console.log(
            gradient.vice.multiline(
                createBanner({
                    logo: [
                        String.raw`       __`,
                        String.raw`    __╱‾‾╲__`,
                        String.raw` __╱‾‾╲__╱‾‾╲__`,
                        String.raw`╱‾‾╲__╱  ╲__╱‾‾╲`,
                        String.raw`╲__╱  ╲__╱  ╲__╱`,
                        String.raw`   ╲__╱  ╲__╱`,
                        String.raw`      ╲__╱`,
                        ""
                    ],
                    name: [
                        String.raw`    _______  ________  ________  ________  ________  ________  ________ `,
                        String.raw`  ╱╱       ╲╱        ╲╱        ╲╱        ╲╱  ╱  ╱  ╲╱        ╲╱    ╱   ╲ `,
                        String.raw` ╱╱      __╱         ╱        _╱         ╱         ╱         ╱         ╱ `,
                        String.raw`╱       ╱ ╱         ╱╱       ╱╱        _╱         ╱         ╱╲__      ╱ `,
                        String.raw`╲________╱╲___╱____╱ ╲______╱ ╲________╱╲________╱╲___╱____╱   ╲_____╱ `
                    ],
                    extra: [
                        ` Nezu Gateway: v${packageJson.version}`,
                        ` └ ShardCount: ${shardCount} shards`
                    ]
                })
            )
        );
    }

    public async clearCaches(route: boolean) {
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.USER_KEY}` : RedisKey.USER_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.MEMBER_KEY}` : RedisKey.MEMBER_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.CHANNEL_KEY}` : RedisKey.CHANNEL_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.GUILD_KEY}` : RedisKey.GUILD_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.VOICE_KEY}` : RedisKey.VOICE_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.ROLE_KEY}` : RedisKey.ROLE_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.PRESENCE_KEY}` : RedisKey.PRESENCE_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.MESSAGE_KEY}` : RedisKey.MESSAGE_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.SESSIONS_KEY}` : RedisKey.SESSIONS_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.STATUSES_KEY}` : RedisKey.STATUSES_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${RedisKey.EMOJI_KEY}` : RedisKey.EMOJI_KEY }).clear();

        await this.redis.unlink(route ? `${this.clientId}:${RedisKey.SHARDS_KEY}` : RedisKey.SHARDS_KEY);
    }
}

declare module "@sapphire/pieces" {
    interface Container {
        tasks?: GatewayInitiator["tasks"];
        prometheus?: GatewayInitiator["prometheus"];
        ws?: GatewayInitiator["ws"];
        clientId?: GatewayInitiator["clientId"];
        redis?: GatewayInitiator["redis"];
        logger?: GatewayInitiator["logger"];
    }
}
