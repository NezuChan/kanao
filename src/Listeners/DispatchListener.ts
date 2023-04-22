import { WebSocketShardEvents } from "@discordjs/ws";
import { Listener, ListenerContext } from "../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayDispatchPayload } from "discord-api-types/v10";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "../Utilities/RoutingKey.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Dispatch
        });
    }

    public run(payload: { shardId: number; data: { data: GatewayDispatchPayload } }): void {
        switch (payload.data.data.t) {
            case GatewayDispatchEvents.ChannelCreate:
            case GatewayDispatchEvents.ChannelPinsUpdate:
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
            case GatewayDispatchEvents.GuildMemberAdd:
            case GatewayDispatchEvents.GuildMembersChunk:
            case GatewayDispatchEvents.GuildRoleCreate:
            case GatewayDispatchEvents.MessageCreate:
            case GatewayDispatchEvents.GuildRoleUpdate:
            case GatewayDispatchEvents.GuildRoleDelete:
                this.store.emitter.emit(payload.data.data.t, { shardId: payload.shardId, data: payload.data.data });
                break;
            default:
                this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(payload.shardId), Buffer.from(JSON.stringify(payload.data.data)));
                break;
        }
    }
}
