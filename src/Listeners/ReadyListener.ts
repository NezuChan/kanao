import { WebSocketShardEvents } from "@discordjs/ws";
import type { GatewayReadyDispatch } from "discord-api-types/v10";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Ready
        });
    }

    public run(payload: { data: { data: GatewayReadyDispatch["d"]; }; shardId: number; }): void {
        this.logger.info(`Shard ${payload.shardId} is ready !`);
    }
}
