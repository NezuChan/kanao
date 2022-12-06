/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
import EventEmitter from "node:events";
import { SessionInfo, WebSocketManager, WorkerShardingStrategy } from "@discordjs/ws";
import { GatewayIntentBits } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import Redis from "ioredis";
import { Result } from "@sapphire/result";
import pino from "pino";
import { resolve } from "node:path";
import { Util } from "../Utilities/Util.js";
import { ListenerStore } from "../Stores/ListenerStore.js";
import { container, Piece, Store, StoreRegistry } from "@sapphire/pieces";
import { createBanner } from "@skyra/start-banner";
import gradient from "gradient-string";
import { Constants } from "../Utilities/Constants.js";
import { RedisCollection } from "@nezuchan/redis-collection";

export class NezuGateway extends EventEmitter {
    public rest = new REST({
        api: process.env.NIRN_PROXY ?? "https://discord.com/api"
    });

    public stores = new StoreRegistry();

    public redis = new Redis({
        username: process.env.REDIS_USERNAME!,
        password: process.env.REDIS_PASSWORD!,
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT!)
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
        intents:
            GatewayIntentBits.Guilds |
            GatewayIntentBits.MessageContent |
            GatewayIntentBits.GuildMembers |
            GatewayIntentBits.GuildMessages |
            GatewayIntentBits.GuildVoiceStates,
        token: process.env.DISCORD_TOKEN!,
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
        this.stores.register(new ListenerStore());
        this.rest.setToken(process.env.DISCORD_TOKEN!);
        this.ws.setStrategy(new WorkerShardingStrategy(this.ws, { shardsPerWorker: 6 }));
        await Promise.all([...this.stores.values()].map((store: Store<Piece>) => store.loadAll()));
        await this.ws.connect();

        const packageJson = await import("../../package.json", { assert: { type: "json" } });
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
                        ` Nezu Gateway: v${packageJson.default.version}`,
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
