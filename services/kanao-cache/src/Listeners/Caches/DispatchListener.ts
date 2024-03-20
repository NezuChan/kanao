import { Buffer } from "node:buffer";
import { GatewayExchangeRoutes, RabbitMQ } from "@nezuchan/constants";
import { RoutedQueue } from "@nezuchan/utilities";
import { container } from "@sapphire/pieces";
import type { GatewayDispatchPayload } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../Stores/Listener.js";
import { Listener } from "../../Stores/Listener.js";
import { clientId, dispatchMessage } from "../../config.js";

export class DispatchListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: "dispatch"
        });
    }

    public async run(payload: { shardId: number; data: { data: GatewayDispatchPayload; }; }): Promise<void> {
        this.logger.trace({ shardId: payload.shardId, data: payload.data }, "Dispatch event received");

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
        if (dispatchMessage) {
            const routing = new RoutedQueue(GatewayExchangeRoutes.DISPATCH, clientId)
                .shard(payload.shardId);
            await container.client.cacheQueue.publish(RabbitMQ.GATEWAY_EXCHANGE, routing.key, Buffer.from(JSON.stringify(payload.data)));
        }
    }
}
