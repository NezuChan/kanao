import { Store } from "@sapphire/pieces";
import { Listener } from "./Listener.js";
import { Logger } from "pino";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import EventEmitter from "node:events";
import { default as IORedis } from "ioredis";

export class ListenerStore extends Store<Listener> {
    public readonly redis: IORedis.Cluster | IORedis.Redis;
    public readonly logger: Logger;
    public readonly emitter: EventEmitter;

    public constructor(
        options: ListenerStoreOptions
    ) {
        super(Listener, { name: "listeners" });
        this.redis = options.redis;
        this.logger = options.logger;
        this.emitter = options.emitter;
        this.registerPath(resolve(dirname(fileURLToPath(import.meta.url)), "..", "Listeners"));
    }
}

interface ListenerStoreOptions {
    logger: Logger;
    emitter: EventEmitter;
    redis: IORedis.Cluster | IORedis.Redis;
}
