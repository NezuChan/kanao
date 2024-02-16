import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { channels, channelsOverwrite } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import { Result } from "@sapphire/result";
import type { GatewayChannelUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
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
        const channel = await this.store.drizzle.insert(channels).values({
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
        })
            .returning({ id: channels.id })
            .then(c => c[0]);

        if ("permission_overwrites" in payload.data.d && payload.data.d.permission_overwrites !== undefined) {
            await Promise.all(payload.data.d.permission_overwrites.map(async overwrite => Result.fromAsync(async () => {
                await this.store.drizzle.insert(channelsOverwrite).values({
                    userOrRole: overwrite.id,
                    channelId: channel.id,
                    type: overwrite.type,
                    allow: overwrite.allow,
                    deny: overwrite.deny
                }).onConflictDoNothing({
                    target: channelsOverwrite.id
                });
            })));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
