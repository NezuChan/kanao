/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
import EventEmitter from "node:events";
import gradient from "gradient-string";
import APM from "prometheus-middleware";
import { pino } from "pino";
import { default as IORedis } from "ioredis";
import { CompressionMethod, SessionInfo, SimpleShardingStrategy, WorkerShardingStrategy } from "@discordjs/ws";
import { WebSocketManager } from "../Utilities/Websocket/WebsocketManager.js";
import { ProcessShardingStrategy } from "../Utilities/Websocket/ProcessShardingStrategy.js";
import { GatewayIntentBits } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { Result } from "@sapphire/result";
import { resolve } from "node:path";
import { Util } from "../Utilities/Util.js";
import { ListenerStore } from "../Stores/ListenerStore.js";
import { container, Piece, Store, StoreRegistry } from "@sapphire/pieces";
import { createBanner } from "@skyra/start-banner";
import { Constants } from "../Utilities/Constants.js";
import { RedisCollection } from "@nezuchan/redis-collection";
import { ActivityType } from "discord-api-types/v9";
import { PresenceUpdateStatus } from "discord-api-types/payloads";
import { RpcPublisher, RoutingSubscriber, createAmqp, RoutingPublisher } from "@nezuchan/cordis-brokers";
import { TaskStore } from "../Stores/TaskStore.js";
import { cast } from "@sapphire/utilities";

const { default: Redis, Cluster } = IORedis;
const packageJson = Util.loadJSON<{ version: string }>("../../package.json");

export class NezuGateway extends EventEmitter {
    public rest = new REST({
        api: process.env.NIRN_PROXY ?? "https://discord.com/api",
        rejectOnRateLimit: process.env.NIRN_PROXY ? () => false : null
    });

    public clientId = Buffer.from(process.env.DISCORD_TOKEN!.split(".")[0], "base64").toString();
    public stores = new StoreRegistry();
    public resetInvalidatedOnStart = true;

    public prometheus = new APM({
        PORT: process.env.PROMETHEUS_PORT ?? 9090,
        METRICS_ROUTE: process.env.PROMETHEUS_PATH ?? "/metrics"
    });

    public redis =
        cast<IORedis.ClusterNode[]>(JSON.parse(process.env.REDIS_CLUSTERS ?? "[]")).length
            ? new Cluster(
                cast<IORedis.ClusterNode[]>(JSON.parse(process.env.REDIS_CLUSTERS!)),
                {
                    scaleReads: cast<IORedis.NodeRole>(process.env.REDIS_CLUSTER_SCALE_READS ?? "all"),
                    redisOptions: {
                        password: process.env.REDIS_PASSWORD,
                        username: process.env.REDIS_USERNAME,
                        db: parseInt(process.env.REDIS_DB ?? "0")
                    }
                }
            )
            : new Redis({
                username: process.env.REDIS_USERNAME!,
                password: process.env.REDIS_PASSWORD!,
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT!),
                db: Number(process.env.REDIS_DB ?? 0)
            });

    public logger = pino({
        name: "nezu-gateway",
        timestamp: true,
        level: process.env.NODE_ENV === "production" ? "info" : "trace",
        formatters: {
            bindings: () => ({
                pid: "NezukoChan Gateway"
            })
        },
        transport: {
            targets: process.env.STORE_LOGS === "true"
                ? [
                    { target: "pino/file", level: "info", options: { destination: resolve(process.cwd(), "logs", `nezu-gateway-${this.date()}.log`) } },
                    { target: "pino-pretty", level: process.env.NODE_ENV === "production" ? "info" : "trace", options: { translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l o" } }
                ]
                : [
                    { target: "pino-pretty", level: process.env.NODE_ENV === "production" ? "info" : "trace", options: { translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l o" } }
                ]
        }
    });

    public ws = new WebSocketManager({
        intents: process.env.GATEWAY_INTENTS
            ? Number(process.env.GATEWAY_INTENTS)
            : GatewayIntentBits.Guilds |
            GatewayIntentBits.MessageContent |
            GatewayIntentBits.GuildMembers |
            GatewayIntentBits.GuildMessages |
            GatewayIntentBits.GuildVoiceStates,
        helloTimeout: process.env.GATEWAY_HELLO_TIMEOUT ? Number(process.env.GATEWAY_HELLO_TIMEOUT) : null,
        readyTimeout: process.env.GATEWAY_READY_TIMEOUT ? Number(process.env.GATEWAY_READY_TIMEOUT) : null,
        handshakeTimeout: process.env.GATEWAY_HANDSHAKE_TIMEOUT ? Number(process.env.GATEWAY_HANDSHAKE_TIMEOUT) : null,
        largeThreshold: Number(process.env.GATEWAY_LARGE_THRESHOLD ?? 250),
        token: process.env.DISCORD_TOKEN!,
        shardCount: process.env.GATEWAY_SHARD_COUNT ? Number(process.env.GATEWAY_SHARD_COUNT) : null,
        shardIds: process.env.GATEWAY_SHARD_START && process.env.GATEWAY_SHARD_END
            ? {
                start: Number(process.env.GATEWAY_SHARD_START),
                end: Number(process.env.GATEWAY_SHARD_END)
            }
            : null,
        initialPresence: {
            activities: [
                {
                    name: process.env.GATEWAY_PRESENCE_NAME ?? `NezukoChan Gateway ${packageJson.version}`,
                    type: process.env.GATEWAY_PRESENCE_TYPE ? Number(process.env.GATEWAY_PRESENCE_TYPE) : ActivityType.Playing
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
                const collection = new RedisCollection<SessionInfo>({
                    redis: this.redis,
                    hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.SESSIONS_KEY}` : Constants.SESSIONS_KEY
                });

                const result = await Result.fromAsync(() => collection.set(`${shardId}`, sessionInfo));

                if (result.isErr()) this.logger.error(result.unwrapErr(), "Failed to update session info");
            }
        },
        retrieveSessionInfo: async (shardId: number) => {
            const collection = new RedisCollection<string, SessionInfo>({
                redis: this.redis,
                hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.SESSIONS_KEY}` : Constants.SESSIONS_KEY
            });

            const result = await Result.fromAsync(() => collection.get(`${shardId}`));
            if (result.isErr()) return null;
            const sessionInfo = result.unwrap();
            await collection.delete(`${shardId}`);
            return sessionInfo ? sessionInfo : null;
        }
    });

    public tasks!: {
        sender: RpcPublisher<string, Record<string, any>>;
        receiver: RoutingSubscriber<string, Record<string, any>>;
    };

    public amqp!: {
        sender: RoutingPublisher<string, Record<string, any>>;
        receiver: RoutingSubscriber<string, Record<string, any>>;
    };

    public constructor() {
        super();
    }

    public date(): string {
        return Util.formatDate(Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour12: false
        }));
    }

    public async connect() {
        container.gateway = this;

        if (process.env.PROMETHEUS_ENABLED === "true") this.prometheus.init();
        const { channel } = await createAmqp(process.env.AMQP_HOST ?? process.env.AMQP_URL!);

        this.tasks = {
            sender: new RpcPublisher(channel),
            receiver: new RoutingSubscriber(channel)
        };

        this.amqp = {
            sender: new RoutingPublisher(channel),
            receiver: new RoutingSubscriber(channel)
        };

        const gatewaySessions = await new RedisCollection<SessionInfo>({
            redis: this.redis,
            hash: Constants.SESSIONS_KEY
        }).valuesArray();

        if (gatewaySessions.length && process.env.USE_ROUTING !== "true") {
            this.logger.info(`Found ${gatewaySessions.length} resumeable gateway sessions in Redis`);
        } else if (process.env.USE_ROUTING === "true") {
            this.logger.info("Starting in routing mode, clearing all data from Redis");
            await new RedisCollection({ redis: this.redis, hash: Constants.SESSIONS_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: Constants.GUILD_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: Constants.CHANNEL_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: Constants.MESSAGE_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: Constants.ROLE_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: Constants.EMOJI_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: Constants.MEMBER_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: Constants.PRESENCE_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: Constants.VOICE_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: Constants.STATUSES_KEY }).clear();
            await this.redis.del(Constants.SHARDS_KEY); this.logger.warn("Cleared up existing cache collections, switched to routing mode");
        } else {
            this.logger.warn("No gateway sessions found in Redis, starting fresh");
            await new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.GUILD_KEY}` : Constants.GUILD_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.CHANNEL_KEY}` : Constants.CHANNEL_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.MESSAGE_KEY}` : Constants.MESSAGE_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.ROLE_KEY}` : Constants.ROLE_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.EMOJI_KEY}` : Constants.EMOJI_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.MEMBER_KEY}` : Constants.MEMBER_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.PRESENCE_KEY}` : Constants.PRESENCE_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.VOICE_KEY}` : Constants.VOICE_KEY }).clear();
            await new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.STATUSES_KEY}` : Constants.STATUSES_KEY }).clear();
            await this.redis.del(process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.SHARDS_KEY}` : Constants.SHARDS_KEY);
            this.logger.warn("Cleared up existing cache collections");
        }

        if (process.env.USE_ROUTING === "true") {
            await this.amqp.sender.init({ name: Constants.QUEUE_RECV, useExchangeBinding: true, exchangeType: "direct" });
            await this.amqp.receiver.init({ name: Constants.QUEUE_SEND, useExchangeBinding: true, keys: this.clientId, durable: true });
        } else {
            await this.amqp.sender.init({ name: Constants.QUEUE_RECV, useExchangeBinding: true, exchangeType: "fanout", queue: Constants.EXCHANGE });
            await this.amqp.receiver.init({ queue: Constants.QUEUE_SEND, keys: "*", durable: true });
        }

        await this.tasks.receiver.init({ name: Constants.TASKS_RECV, keys: "*", durable: true, exchangeType: "topic", useExchangeBinding: true });
        await this.tasks.sender.init({ name: Constants.TASKS_SEND, autoAck: true });

        this.stores.register(new ListenerStore());
        this.stores.register(new TaskStore());
        this.rest.setToken(process.env.DISCORD_TOKEN!);
        await Promise.all([...this.stores.values()].map((store: Store<Piece>) => store.loadAll()));
        if (process.env.USE_SIMPLE_SHARDING === "true") {
            this.ws.setStrategy(new SimpleShardingStrategy(this.ws));
        } else if (process.env.USE_PROCESS_SHARDING === "true") {
            this.ws.setStrategy(
                new ProcessShardingStrategy(this.ws, {
                    shardsPerWorker: Number(process.env.GATEWAY_SHARDS_PERWORKERS ?? 9)
                })
            );
        } else {
            this.ws.setStrategy(
                new WorkerShardingStrategy(this.ws, {
                    shardsPerWorker: Number(process.env.GATEWAY_SHARDS_PERWORKERS ?? 9)
                })
            );
        }
        await this.ws.connect();
        const shardCount = await this.ws.getShardCount();

        const gatewayStatusCollection = new RedisCollection({ redis: this.redis, hash: Constants.STATUSES_KEY });
        await gatewayStatusCollection.clear();
        let shardId = -1;
        while (shardId < (shardCount - 1)) {
            shardId += 1;
            await gatewayStatusCollection.set(`${shardId}`, { shardId, ping: -1 });
        }

        await this.redis.set(Constants.SHARDS_KEY, shardCount);

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
}

declare module "@sapphire/pieces" {
    interface Container {
        gateway: NezuGateway;
    }
    interface StoreRegistryEntries {
        listeners: ListenerStore;
    }
}
