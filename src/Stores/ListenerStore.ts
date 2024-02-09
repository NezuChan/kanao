import type EventEmitter from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "@sapphire/pieces";
import type { ChannelWrapper } from "amqp-connection-manager";
import type { default as IORedis } from "ioredis";
import type { Logger } from "pino";
import { Listener } from "./Listener.js";

export class ListenerStore extends Store<Listener> {
    public readonly redis: IORedis.Cluster | IORedis.Redis;
    public readonly logger: Logger;
    public readonly emitter: EventEmitter;
    public readonly amqp: ChannelWrapper;

    public constructor(
        options: ListenerStoreOptions
    ) {
        super(Listener, { name: "listeners" as never });
        this.redis = options.redis;
        this.logger = options.logger;
        this.emitter = options.emitter;
        this.amqp = options.amqp;
        this.registerPath(resolve(dirname(fileURLToPath(import.meta.url)), "..", "Listeners"));
    }
}

type ListenerStoreOptions = {
    logger: Logger;
    emitter: EventEmitter;
    redis: IORedis.Cluster | IORedis.Redis;
    amqp: ChannelWrapper;
};
