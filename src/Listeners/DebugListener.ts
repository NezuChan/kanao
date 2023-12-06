import { WebSocketShardEvents } from "@discordjs/ws";
import { Listener, ListenerContext } from "../Stores/Listener.js";

export class DebugListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Debug
        });
    }

    public run(payload: { shardId: number }): unknown {
        return this.logger.debug(payload, `Shard ${payload.shardId} debug`);
    }
}
