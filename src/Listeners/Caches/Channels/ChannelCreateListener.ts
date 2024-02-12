import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayChannelCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { channels, channelsOverwrite, guildsChannels } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateChannels } from "../../../config.js";

export class ChannelCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelCreate
        });
    }

    public async run(payload: { data: GatewayChannelCreateDispatch; shardId: number; }): Promise<void> {
        if (stateChannels) {
            await this.store.drizzle.insert(channels).values({
                id: payload.data.d.id,
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

            if ("guild_id" in payload.data.d) {
                await this.store.drizzle.insert(guildsChannels).values({
                    id: payload.data.d.id,
                    guildId: payload.data.d.guild_id
                }).onConflictDoNothing({ target: guildsChannels.id });
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
