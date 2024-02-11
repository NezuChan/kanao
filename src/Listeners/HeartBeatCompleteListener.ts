import type { WebSocketShard } from "@discordjs/ws";
import { WebSocketShardEvents } from "@discordjs/ws";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.HeartbeatComplete
        });
    }

    public run(payload: { shard: WebSocketShard; shardId: number; data: { latency: number; }; }): void {
        this.store.logger.debug(payload.data, `Shard ${payload.shardId} heartbeat complete`);
    }
}
