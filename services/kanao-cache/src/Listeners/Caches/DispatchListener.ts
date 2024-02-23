import { Buffer } from "node:buffer";
import { container } from "@sapphire/pieces";
import type { GatewayDispatchPayload, GatewayMessageCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../Stores/Listener.js";
import { Listener } from "../../Stores/Listener.js";
import { GatewayExchangeRoutes, RoutedQueue, RabbitMQ } from "../../Utilities/amqp.js";
import { clientId } from "../../config.js";

export class DispatchListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: "dispatch"
        });
    }

    public async run(payload: { shardId: number; data: { data: GatewayDispatchPayload; }; }): Promise<void> {
        switch (payload.data.data.t) {
            case GatewayDispatchEvents.GuildCreate:
            case GatewayDispatchEvents.ChannelCreate:
            case GatewayDispatchEvents.ChannelDelete:
            case GatewayDispatchEvents.ChannelUpdate:
            case GatewayDispatchEvents.GuildDelete:
            case GatewayDispatchEvents.GuildMemberRemove:
            case GatewayDispatchEvents.GuildMemberUpdate:
            case GatewayDispatchEvents.GuildUpdate:
            case GatewayDispatchEvents.MessageDeleteBulk:
            case GatewayDispatchEvents.MessageDelete:
            case GatewayDispatchEvents.MessageUpdate:
            case GatewayDispatchEvents.VoiceStateUpdate:
            case GatewayDispatchEvents.GuildMemberAdd:
            case GatewayDispatchEvents.GuildMembersChunk:
            case GatewayDispatchEvents.GuildRoleCreate:
            case GatewayDispatchEvents.MessageCreate:
            case GatewayDispatchEvents.GuildRoleUpdate:
            case GatewayDispatchEvents.GuildRoleDelete:
            case GatewayDispatchEvents.Ready:
                this.container.client.emit(payload.data.data.t, { shardId: payload.shardId, data: payload.data.data });
                break;
            default:
                await DispatchListener.dispatch({ shardId: payload.shardId, data: payload.data.data });
                break;
        }
    }

    public static async dispatch(payload: { shardId: number; data: GatewayDispatchPayload; }): Promise<void> {
        const routing = new RoutedQueue(GatewayExchangeRoutes.DISPATCH, clientId)
            .shard(payload.shardId);

        console.log(clientId, (payload.data.d as GatewayMessageCreateDispatch["d"]).guild_id);
        console.log(routing.key); // dispatch.982891490445525063.0

        await container.client.amqp.publish(RabbitMQ.GATEWAY_EXCHANGE, routing.key, Buffer.from(JSON.stringify(payload.data.d)));
    }
}
