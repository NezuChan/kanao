import { WebSocketShardEvents } from "@discordjs/ws";
import { GatewayDispatchEvents, GatewayDispatchPayload } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../../Stores/Listener.js";
import { ApplyOptions } from "../../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: WebSocketShardEvents.Dispatch,
    emitter: container.gateway.ws
}))

export class DispatchListener extends Listener {
    public run(payload: { data: GatewayDispatchPayload; shardId: number }): void {
        switch (payload.data.t) {
            case GatewayDispatchEvents.ChannelDelete:
            case GatewayDispatchEvents.ChannelUpdate:
            case GatewayDispatchEvents.GuildCreate:
            case GatewayDispatchEvents.GuildDelete:
            case GatewayDispatchEvents.GuildEmojisUpdate:
            case GatewayDispatchEvents.GuildMemberRemove:
            case GatewayDispatchEvents.GuildMemberUpdate:
            case GatewayDispatchEvents.GuildUpdate:
            case GatewayDispatchEvents.MessageDeleteBulk:
            case GatewayDispatchEvents.MessageDelete:
            case GatewayDispatchEvents.MessageUpdate:
            case GatewayDispatchEvents.VoiceStateUpdate:
            case GatewayDispatchEvents.Ready:
            case GatewayDispatchEvents.ChannelCreate:
            case GatewayDispatchEvents.ChannelPinsUpdate:
            case GatewayDispatchEvents.GuildMemberAdd:
            case GatewayDispatchEvents.GuildMembersChunk:
            case GatewayDispatchEvents.GuildRoleCreate:
            case GatewayDispatchEvents.MessageCreate:
                this.container.gateway.emit(payload.data.t, payload);
                break;
            default:
                this.container.gateway.amqp.sender.publish(process.env.USE_ROUTING === "true" ? this.container.gateway.clientId : payload.data.t, payload, { persistent: false });
                break;
        }
    }
}
