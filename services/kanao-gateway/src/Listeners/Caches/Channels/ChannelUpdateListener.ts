import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { channels, channelsOverwrite } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayChannelUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateChannels } from "../../../config.js";

export class ChannelUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelUpdate,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelUpdateDispatch; shardId: number; }): Promise<void> {
        await this.store.drizzle.insert(channels).values({
            id: payload.data.d.id,
            guildId: "guild_id" in payload.data.d ? payload.data.d.guild_id : null,
            name: payload.data.d.name,
            type: payload.data.d.type,
            position: "position" in payload.data.d ? payload.data.d.position : null,
            topic: "topic" in payload.data.d ? payload.data.d.topic : null,
            nsfw: "nsfw" in payload.data.d ? payload.data.d.nsfw : null,
            lastMessageId: "last_message_id" in payload.data.d ? payload.data.d.last_message_id : undefined
        }).onConflictDoUpdate({
            target: channels.id,
            set: {
                name: payload.data.d.name,
                type: payload.data.d.type,
                position: "position" in payload.data.d ? payload.data.d.position : null,
                topic: "topic" in payload.data.d ? payload.data.d.topic : null,
                nsfw: "nsfw" in payload.data.d ? payload.data.d.nsfw : null,
                lastMessageId: "last_message_id" in payload.data.d ? payload.data.d.last_message_id : undefined
            }
        });

        if ("permission_overwrites" in payload.data.d && payload.data.d.permission_overwrites !== undefined) {
            await this.store.drizzle.delete(channelsOverwrite).where(eq(channelsOverwrite.id, payload.data.d.id));
            for (const overwrite of payload.data.d.permission_overwrites) {
                await this.store.drizzle.insert(channelsOverwrite).values({
                    id: payload.data.d.id,
                    type: overwrite.type,
                    allow: overwrite.allow,
                    deny: overwrite.deny
                }).onConflictDoNothing({
                    target: channelsOverwrite.id
                });
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
