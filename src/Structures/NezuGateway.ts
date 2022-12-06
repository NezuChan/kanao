/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
import EventEmitter from "node:events";
import gradient from "gradient-string";
import { pino } from "pino";
import { default as IORedis } from "ioredis";
import { SessionInfo, WebSocketManager, WorkerShardingStrategy } from "@discordjs/ws";
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
import { RpcPublisher, RoutingSubscriber, createAmqp } from "@nezuchan/cordis-brokers";
import { TaskStore } from "../Stores/TaskStore.js";

const { default: Redis } = IORedis;
const packageJson = Util.loadJSON<{ version: string }>("../../package.json");

export class NezuGateway extends EventEmitter {
    public rest = new REST({
        api: process.env.NIRN_PROXY ?? "https://discord.com/api"
    });

    public stores = new StoreRegistry();

    public redis = new Redis({
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
            targets: [
                { target: "pino/file", level: "info", options: { destination: resolve(process.cwd(), "logs", `nezu-gateway-${this.date()}.log`) } },
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
        largeThreshold: Number(process.env.GATEWAY_LARGE_THRESHOLD ?? 250),
        token: process.env.DISCORD_TOKEN!,
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
        rest: this.rest,
        updateSessionInfo: async (shardId: number, sessionInfo: SessionInfo | null) => {
            if (sessionInfo) {
                const collection = new RedisCollection<SessionInfo>({
                    redis: this.redis,
                    hash: Constants.SESSIONS_KEY
                });

                const result = await Result.fromAsync(async () => {
                    await this.redis.set("shard_count", sessionInfo.shardCount);
                    return collection.set(`${shardId}`, sessionInfo);
                });

                if (result.isErr()) this.logger.error(result.unwrapErr(), "Failed to update session info");
            }
        },
        retrieveSessionInfo: async (shardId: number) => {
            const collection = new RedisCollection<string, SessionInfo>({
                redis: this.redis,
                hash: Constants.SESSIONS_KEY
            });

            const result = await Result.fromAsync(() => collection.get(`${shardId}`));
            if (result.isErr()) return null;
            const sessionInfo = result.unwrap();
            return sessionInfo ? sessionInfo : null;
        }
    });

    public tasks!: {
        sender: RpcPublisher<string, Record<string, any>>;
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
        const { channel } = await createAmqp(process.env.AMQP_HOST!);

        this.tasks = {
            sender: new RpcPublisher(channel),
            receiver: new RoutingSubscriber(channel)
        };

        await this.tasks.receiver.init({ name: Constants.TASKS_RECV, keys: "*", durable: true, exchangeType: "topic", useExchangeBinding: true });
        await this.tasks.sender.init({ name: Constants.TASKS_SEND, autoAck: true });

        this.stores.register(new ListenerStore());
        this.stores.register(new TaskStore());
        this.rest.setToken(process.env.DISCORD_TOKEN!);
        this.ws.setStrategy(new WorkerShardingStrategy(this.ws, { shardsPerWorker: 6 }));
        await Promise.all([...this.stores.values()].map((store: Store<Piece>) => store.loadAll()));
        await this.ws.connect();

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
                        ` └ ShardCount: ${this.ws.options.shardCount ?? 1} shards`
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
