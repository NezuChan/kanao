import type EventEmitter from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "@sapphire/pieces";
import type { ChannelWrapper } from "amqp-connection-manager";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3/driver";
import type { Logger } from "pino";
import type * as schema from "../Structures/DatabaseSchema.js";
import { Listener } from "./Listener.js";

export class ListenerStore extends Store<Listener> {
    public readonly drizzle: BetterSQLite3Database<typeof schema>;
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
    drizzle: BetterSQLite3Database<typeof schema>;
    amqp: ChannelWrapper;
};
