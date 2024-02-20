import { Buffer } from "node:buffer";
import { WebSocketShardEvents, WebSocketShardStatus } from "@discordjs/ws";
import { RabbitMQ } from "@nezuchan/constants";
import { status } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayDispatchPayload } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq, not } from "drizzle-orm";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";
import { clientId } from "../config.js";

export class ReadyListener extends Listener {
    public ready = false;
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Dispatch
        });
    }

    public async run(payload: { shardId: number; data: { data: GatewayDispatchPayload; }; }): Promise<void> {
        if (payload.data.data.t === GatewayDispatchEvents.GuildCreate) {
            this.store.emitter.emit(payload.data.data.t, { shardId: payload.shardId, data: payload.data.data });
        }

        if (!this.ready) {
            const statuses = await this.store.drizzle.select({ shardId: status.shardId }).from(status)
                .where(not(eq(status.status, WebSocketShardStatus.Ready)));
            this.ready = statuses.length === 0;
            return;
        }

        switch (payload.data.data.t) {
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
                this.store.emitter.emit(payload.data.data.t, { shardId: payload.shardId, data: payload.data.data });
                break;
            default:
                await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data.data)));
                break;
        }
    }
}
