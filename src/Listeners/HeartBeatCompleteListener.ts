import { WebSocketShard, WebSocketShardEvents } from "@discordjs/ws";
import { Listener, ListenerContext } from "../Stores/Listener.js";
import { clientId } from "../config.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.HeartbeatComplete
        });
    }

    public async run(payload: { shard: WebSocketShard; shardId: number; data: { latency: number } }): Promise<void> {
        this.store.logger.debug(payload.data, `Shard ${payload.shardId} heartbeat complete`);
        await this.store.redis.set(`${clientId}:gateway_shard_status:${payload.shardId}`, JSON.stringify({ latency: payload.data.latency, status: payload.shard.status }));
    }
}
