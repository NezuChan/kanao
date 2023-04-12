/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
import EventEmitter from "node:events";
import { default as IORedis } from "ioredis";
import { REST } from "@discordjs/rest";
import { Util } from "../Utilities/Util.js";
import { ListenerStore } from "../Stores/ListenerStore.js";
import { container, Piece, Store, StoreRegistry } from "@sapphire/pieces";
import { createAmqp, RoutingPublisher } from "@nezuchan/cordis-brokers";
import { RedisCollection } from "@nezuchan/redis-collection";
import { APIEmoji, APIMessage } from "discord-api-types/v10";
import { createLogger } from "../Utilities/Logger.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { amqp, discordToken, lokiHost, proxy, redisClusters, redisClusterScaleReads, redisDb, redisHost, redisNatMap, redisPassword, redisPort, redisUsername, storeLogs, useRouting } from "../config.js";

const { default: Redis, Cluster } = IORedis;

export class NezuGateway extends EventEmitter {
    public clientId = Buffer.from(discordToken!.split(".")[0], "base64").toString();

    public rest = new REST({
        api: proxy,
        rejectOnRateLimit: proxy === "https://discord.com/api" ? null : () => false
    });

    public stores = new StoreRegistry();

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

    public cache = {
        users: new RedisCollection({ redis: this.redis, hash: this.genKey(RedisKey.USER_KEY, false) }),
        members: new RedisCollection({ redis: this.redis, hash: this.genKey(RedisKey.MEMBER_KEY, false) }),
        channels: new RedisCollection({ redis: this.redis, hash: this.genKey(RedisKey.CHANNEL_KEY, false) }),
        guilds: new RedisCollection({ redis: this.redis, hash: this.genKey(RedisKey.GUILD_KEY, false) }),
        states: new RedisCollection({ redis: this.redis, hash: this.genKey(RedisKey.VOICE_KEY, false) }),
        roles: new RedisCollection({ redis: this.redis, hash: this.genKey(RedisKey.ROLE_KEY, false) }),
        messages: new RedisCollection<APIMessage, APIMessage>({ redis: this.redis, hash: this.genKey(RedisKey.MESSAGE_KEY, false) }),
        presences: new RedisCollection({ redis: this.redis, hash: this.genKey(RedisKey.PRESENCE_KEY, false) }),
        sessions: new RedisCollection({ redis: this.redis, hash: this.genKey(RedisKey.SESSIONS_KEY, false) }),
        statuses: new RedisCollection({ redis: this.redis, hash: this.genKey(RedisKey.STATUSES_KEY, false) }),
        emojis: new RedisCollection<APIEmoji, APIEmoji>({ redis: this.redis, hash: this.genKey(RedisKey.EMOJI_KEY, false) })
    };

    public logger = createLogger("nezu-gateway", this.clientId, storeLogs, lokiHost ? new URL(lokiHost) : undefined);

    public amqp!: {
        sender: RoutingPublisher<string, Record<string, any>>;
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

        const { channel } = await createAmqp(amqp!);

        this.amqp = {
            sender: new RoutingPublisher(channel)
        };

        if (useRouting) {
            await this.amqp.sender.init({ name: RabbitMQ.GATEWAY_QUEUE_RECV, useExchangeBinding: true, exchangeType: "direct" });
        } else {
            await this.amqp.sender.init({ name: RabbitMQ.GATEWAY_QUEUE_RECV, useExchangeBinding: true, exchangeType: "fanout", queue: RabbitMQ.GATEWAY_EXCHANGE });
        }

        this.stores.register(new ListenerStore());
        this.rest.setToken(discordToken!);
        await Promise.all([...this.stores.values()].map((store: Store<Piece>) => store.loadAll()));
    }

    public genKey(key: string, suffix: boolean) {
        return Util.genKey(key, this.clientId, suffix);
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
