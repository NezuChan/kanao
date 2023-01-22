import { Listener, ListenerOptions } from "../../Stores/Listener.js";
import { ApplyOptions } from "../../Utilities/Decorators/ApplyOptions.js";
import { WebSocketShardEvents } from "@discordjs/ws";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: WebSocketShardEvents.Ready,
    emitter: container.gateway
}))

export class SocketReadyListener extends Listener {
    public run(payload: { shardId: number }): void {
        this.container.gateway.logger.info(`Shard ${payload.shardId} ready`); this.container.gateway.resetInvalidatedOnStart = false;
    }
}
