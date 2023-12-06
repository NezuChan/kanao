import { WebSocketShardEvents } from "@discordjs/ws";
import { Listener, ListenerContext } from "../Stores/Listener.js";

export class ClosedListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Closed
        });
    }

    public run(payload: { data: { code: number }; shardId: number }): unknown {
        return this.logger.info(`Shard ${payload.shardId} has been closed, close code ${payload.data.code}`);
    }
}
