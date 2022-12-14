import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>({
    name: "ErrorListener",
    event: "error"
})

export class ErrorListener extends Listener {
    public run(error: Error): void {
        this.container.gateway.logger.error(error, "ErrorListener");
    }
}
