/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable class-methods-use-this */
import gradient from "gradient-string";
import { default as IORedis } from "ioredis";
import { CompressionMethod, SessionInfo, WebSocketShardEvents } from "@discordjs/ws";
import { WebSocketManager } from "../Utilities/Websocket/WebsocketManager.js";
import { ProcessShardingStrategy } from "../Utilities/Websocket/ProcessShardingStrategy.js";
import { GatewayIntentBits, GatewaySendPayload } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { Result } from "@sapphire/result";
import { Util } from "../Utilities/Util.js";
import { createBanner } from "@skyra/start-banner";
import { Constants } from "../Utilities/Constants.js";
import { RedisCollection } from "@nezuchan/redis-collection";
import { ActivityType } from "discord-api-types/v9";
import { PresenceUpdateStatus } from "discord-api-types/payloads";
import { cast } from "@sapphire/utilities";
import APM from "prometheus-middleware";
import { RpcPublisher, RoutingSubscriber, createAmqp } from "@nezuchan/cordis-brokers";
import { Piece, Store, StoreRegistry, container } from "@sapphire/pieces";
import { TaskStore } from "../Stores/TaskStore.js";
import { createLogger } from "../Utilities/Logger.js";

const { default: Redis, Cluster } = IORedis;
const packageJson = Util.loadJSON<{ version: string }>("../../package.json");

export class GatewayInitiator {
    public prometheus = new APM({
        PORT: process.env.PROMETHEUS_PORT ?? 9090,
        METRICS_ROUTE: process.env.PROMETHEUS_PATH ?? "/metrics"
    });

    public rest = new REST({
        api: process.env.NIRN_PROXY ?? "https://discord.com/api",
        rejectOnRateLimit: process.env.NIRN_PROXY ? () => false : null
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

    public clientId = Buffer.from(process.env.DISCORD_TOKEN!.split(".")[0], "base64").toString();

    public logger = createLogger("nezu-gateway", this.clientId, process.env.STORE_LOGS === "true", process.env.LOKI_HOST ? new URL(process.env.LOKI_HOST) : undefined);

    public ws = new WebSocketManager({
        buildStrategy: (manager: WebSocketManager) => new ProcessShardingStrategy(manager, {
            shardsPerWorker: Number(process.env.GATEWAY_SHARDS_PERWORKERS ?? 9)
        }),
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
        sessions: new RedisCollection<SessionInfo, SessionInfo>({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.SESSIONS_KEY}` : Constants.SESSIONS_KEY }),
        statuses: new RedisCollection({ redis: this.redis, hash: process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.STATUSES_KEY}` : Constants.STATUSES_KEY })
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
        if (process.env.PROMETHEUS_ENABLED === "true") this.prometheus.init();
        const { channel } = await createAmqp(process.env.AMQP_HOST ?? process.env.AMQP_URL!);

        this.tasks = {
            sender: new RpcPublisher(channel),
            receiver: new RoutingSubscriber(channel)
        };

        this.amqp = {
            receiver: new RoutingSubscriber(channel)
        };

        if (process.env.USE_ROUTING === "true") {
            await this.amqp.receiver.init({ name: Constants.QUEUE_SEND, useExchangeBinding: true, keys: this.clientId, durable: true });
        } else {
            await this.amqp.receiver.init({ queue: Constants.QUEUE_SEND, keys: "*", durable: true });
        }

        container.tasks = this.tasks;
        container.prometheus = this.prometheus;
        container.ws = this.ws;
        container.clientId = this.clientId;
        container.redis = this.redis;
        container.logger = this.logger;

        this.stores.register(new TaskStore());
        this.rest.setToken(process.env.DISCORD_TOKEN!);
        await Promise.all([...this.stores.values()].map((store: Store<Piece>) => store.loadAll()));

        const gatewaySessions = await this.cache.sessions.size;
        if (gatewaySessions && process.env.USE_ROUTING !== "true") {
            this.logger.info(`Found ${gatewaySessions} resumeable gateway sessions in Redis`);
        } else if (process.env.USE_ROUTING === "true") {
            this.logger.info("Starting in routing mode, clearing all non routed data from Redis");
            await this.clearCaches(false);
            this.logger.warn("Cleared up existing cache collections, switched to routing mode");
        } else {
            this.logger.warn("No gateway sessions found in Redis, starting fresh");
            await this.clearCaches(process.env.USE_ROUTING === "true");
            this.logger.warn("Cleared up existing cache collections");
        }

        await this.ws.connect();
        const shardCount = await this.ws.getShardCount();
        await this.cache.statuses.clear();
        let shardId = -1;
        while (shardId < (shardCount - 1)) {
            shardId += 1; await this.cache.statuses.set(`${shardId}`, { shardId, ping: -1 });
        }
        await this.redis.set(process.env.USE_ROUTING === "true" ? `${this.clientId}:${Constants.SHARDS_KEY}` : Constants.SHARDS_KEY, shardCount);

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
        this.ws.on(WebSocketShardEvents.Error, (payload: { error: Error; shardId: number }) => this.logger.error(payload.error, `Shard ${payload.shardId} throwed error`));

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
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.USER_KEY}` : Constants.USER_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.MEMBER_KEY}` : Constants.MEMBER_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.CHANNEL_KEY}` : Constants.CHANNEL_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.GUILD_KEY}` : Constants.GUILD_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.VOICE_KEY}` : Constants.VOICE_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.ROLE_KEY}` : Constants.ROLE_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.PRESENCE_KEY}` : Constants.PRESENCE_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.MESSAGE_KEY}` : Constants.MESSAGE_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.SESSIONS_KEY}` : Constants.SESSIONS_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.STATUSES_KEY}` : Constants.STATUSES_KEY }).clear();
        await new RedisCollection({ redis: this.redis, hash: route ? `${this.clientId}:${Constants.EMOJI_KEY}` : Constants.EMOJI_KEY }).clear();

        await this.redis.unlink(route ? `${this.clientId}:${Constants.SHARDS_KEY}` : Constants.SHARDS_KEY);
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
