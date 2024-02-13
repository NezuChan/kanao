import type { WebSocketShard } from "@discordjs/ws";
import { WebSocketShardEvents } from "@discordjs/ws";
import { status } from "@nezuchan/kanao-schema";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.HeartbeatComplete
        });
    }

    public async run(payload: { shard: WebSocketShard; shardId: number; data: { latency: number; }; }): Promise<void> {
        await this.store.drizzle.insert(status).values({
            shardId: payload.shardId,
            latency: payload.data.latency,
            lastAck: Date.now().toString(),
            status: payload.shard.status
        }).onConflictDoUpdate({
            target: status.shardId,
            set: {
                latency: payload.data.latency,
                lastAck: Date.now().toString(),
                status: payload.shard.status
            }
        });
        this.store.logger.debug(payload.data, `Shard ${payload.shardId} heartbeat complete`);
    }
}
