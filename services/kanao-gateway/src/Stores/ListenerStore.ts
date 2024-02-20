import type EventEmitter from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type * as schema from "@nezuchan/kanao-schema";
import { Store } from "@sapphire/pieces";
import type { ChannelWrapper } from "amqp-connection-manager";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Logger } from "pino";
import { Listener } from "./Listener.js";

export class ListenerStore extends Store<Listener> {
    public readonly drizzle: NodePgDatabase<typeof schema>;
    public readonly logger: Logger;
    public readonly emitter: EventEmitter;
    public readonly amqp: ChannelWrapper;

    public constructor(
        options: ListenerStoreOptions
    ) {
        super(Listener, { name: "listeners" as never });
        this.drizzle = options.drizzle;
        this.logger = options.logger;
        this.emitter = options.emitter;
        this.amqp = options.amqp;
        this.registerPath(resolve(dirname(fileURLToPath(import.meta.url)), "..", "Listeners"));
    }
}

type ListenerStoreOptions = {
    logger: Logger;
    emitter: EventEmitter;
    drizzle: NodePgDatabase<typeof schema>;
    amqp: ChannelWrapper;
};
