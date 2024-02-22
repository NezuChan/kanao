import type { WebSocketShard } from "@discordjs/ws";
import { WebSocketShardEvents } from "@discordjs/ws";
import { sql } from "drizzle-orm";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";
import { status } from "../Structures/DatabaseSchema.js";

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
                latency: sql`EXCLUDED.latency`,
                lastAck: sql`EXCLUDED.last_ack`,
                status: sql`EXCLUDED.status`
            }
        });
        this.store.logger.debug(payload.data, `Shard ${payload.shardId} heartbeat complete`);
    }
}
