import { WebSocketShardEvents } from "@discordjs/ws";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Resumed
        });
    }

    public run(payload: { shardId: number; }): void {
        this.logger.info(`Shard ${payload.shardId} has resumed`);
    }
}
