import { Listener, ListenerOptions } from "../../Stores/Listener.js";
import { ApplyOptions } from "../../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: "SocketDebugListener",
    event: "debug",
    emitter: container.gateway.ws
}))

export class SocketDebugListener extends Listener {
    public run(message: string): void {
        this.container.gateway.logger.debug(message);
    }
}
