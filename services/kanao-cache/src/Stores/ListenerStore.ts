import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "@sapphire/pieces";
import { Listener } from "./Listener.js";

export class ListenerStore extends Store<Listener> {
    public constructor() {
        super(Listener, { name: "listeners" as never });
        this.registerPath(resolve(dirname(fileURLToPath(import.meta.url)), "..", "Listeners"));
    }
}

// type ListenerStoreOptions = {
//     logger: Logger;
//     emitter: EventEmitter;
//     drizzle: NodePgDatabase<typeof schema>;
//     amqp: ChannelWrapper;
// };
