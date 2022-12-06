import { WebSocketShardEvents } from "@discordjs/ws";
import { GatewayDispatchPayload } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../../Stores/Listener.js";
import { ApplyOptions } from "../../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: WebSocketShardEvents.Dispatch,
    emitter: container.gateway.ws
}))

export class DispatchListener extends Listener {
    public run(payload: { data: GatewayDispatchPayload; shardId: number }): unknown {
        return this.container.gateway.emit(payload.data.t, payload);
    }
}
