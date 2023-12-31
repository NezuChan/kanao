import { WebSocketShard, WebSocketShardEvents } from "@discordjs/ws";
import { Listener, ListenerContext } from "../Stores/Listener.js";
import { GenKey } from "../Utilities/GenKey.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.HeartbeatComplete
        });
    }

    public async run(payload: { shard: WebSocketShard; shardId: number; data: { latency: number } }): Promise<void> {
        this.store.logger.debug(payload.data, `Shard ${payload.shardId} heartbeat complete`);
        const status = JSON.parse(await this.store.redis.get(GenKey("gateway_shard_status", String(payload.shardId))) ?? "{}") as object | { latency: number; status: number; startAt: number };
        await this.store.redis.set(GenKey("gateway_shard_status", String(payload.shardId)), JSON.stringify({ ...status, latency: payload.data.latency, lastAck: Date.now(), status: payload.shard.status }));
    }
}
