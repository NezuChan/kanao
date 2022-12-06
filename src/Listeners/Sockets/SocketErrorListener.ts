import { Listener, ListenerOptions } from "../../Stores/Listener.js";
import { ApplyOptions } from "../../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: "SocketErrorListener",
    event: "error",
    emitter: container.gateway.ws
}))

export class SocketErrorListener extends Listener {
    public run(error: Error): void {
        this.container.gateway.logger.error(error, "SocketErrorListener");
    }
}
