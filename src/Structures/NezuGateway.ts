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
import { cast } from "@sapphire/utilities";
import { RedisCollection } from "@nezuchan/redis-collection";
import { APIEmoji, APIMessage } from "discord-api-types/v10";
import { createLogger } from "../Utilities/Logger.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";

const { default: Redis, Cluster } = IORedis;

export class NezuGateway extends EventEmitter {
    public clientId = Buffer.from(process.env.DISCORD_TOKEN!.split(".")[0], "base64").toString();

    public rest = new REST({
        api: process.env.NIRN_PROXY ?? "https://discord.com/api",
        rejectOnRateLimit: process.env.NIRN_PROXY ? () => false : null
    });

    public stores = new StoreRegistry();

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
                    },
                    natMap: cast<IORedis.NatMap>(JSON.parse(process.env.REDIS_NAT_MAP ?? "{}"))
                }
            )
            : new Redis({
                username: process.env.REDIS_USERNAME!,
                password: process.env.REDIS_PASSWORD!,
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT!),
                db: Number(process.env.REDIS_DB ?? 0),
                natMap: cast<IORedis.NatMap>(JSON.parse(process.env.REDIS_NAT_MAP ?? "{}"))
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

    public logger = createLogger("nezu-gateway", this.clientId, process.env.STORE_LOGS === "true", process.env.LOKI_HOST ? new URL(process.env.LOKI_HOST) : undefined);

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

        const { channel } = await createAmqp(process.env.AMQP_HOST ?? process.env.AMQP_URL!);

        this.amqp = {
            sender: new RoutingPublisher(channel)
        };

        if (process.env.USE_ROUTING === "true") {
            await this.amqp.sender.init({ name: RabbitMQ.GATEWAY_QUEUE_RECV, useExchangeBinding: true, exchangeType: "direct" });
        } else {
            await this.amqp.sender.init({ name: RabbitMQ.GATEWAY_QUEUE_RECV, useExchangeBinding: true, exchangeType: "fanout", queue: RabbitMQ.GATEWAY_EXCHANGE });
        }

        this.stores.register(new ListenerStore());
        this.rest.setToken(process.env.DISCORD_TOKEN!);
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
