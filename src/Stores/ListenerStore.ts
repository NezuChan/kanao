import { Store } from "@sapphire/pieces";
import { Listener } from "./Listener.js";
import { Logger } from "pino";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import EventEmitter from "node:events";

export class ListenerStore extends Store<Listener> {
    public constructor(
        public options: ListenerStoreOptions
    ) {
        super(Listener, { name: "listeners" });
        this.registerPath(resolve(dirname(fileURLToPath(import.meta.url)), "..", "Listeners"));
    }
}

interface ListenerStoreOptions {
    logger: Logger;
    emitter: EventEmitter;
}
