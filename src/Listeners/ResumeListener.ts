import { WebSocketShardEvents } from "@discordjs/ws";
import { Listener, ListenerContext } from "../Stores/Listener.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Resumed
        });
    }

    public run(payload: { shardId: number }): unknown {
        return this.logger.info(`Shard ${payload.shardId} has resumed`);
    }
}
