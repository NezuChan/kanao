import { channels, channelsOverwrite } from "@nezuchan/kanao-schema";
import type { GatewayChannelUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { and, eq, notInArray, sql } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { stateChannels } from "../../../config.js";
import { DispatchListener } from "../DispatchListener.js";

export class ChannelUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelUpdate,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelUpdateDispatch; shardId: number; }): Promise<void> {
        await this.container.client.drizzle.insert(channels).values({
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
                name: sql`EXCLUDED.name`,
                type: sql`EXCLUDED.type`,
                position: sql`EXCLUDED.position`,
                topic: sql`EXCLUDED.topic`,
                nsfw: sql`EXCLUDED.nsfw`,
                lastMessageId: sql`EXCLUDED.last_message_id`
            }
        });

        if ("permission_overwrites" in payload.data.d && payload.data.d.permission_overwrites !== undefined) {
            const lists = payload.data.d.permission_overwrites.map(x => x.id);
            await this.container.client.drizzle.delete(channelsOverwrite).where(
                lists.length > 0
                    ? and(
                        eq(channelsOverwrite.channelId, payload.data.d.id),
                        notInArray(channelsOverwrite.userOrRole, lists)
                    )
                    : eq(channelsOverwrite.channelId, payload.data.d.id)
            );

            if (payload.data.d.permission_overwrites.length > 0) {
                for (const overwrite of payload.data.d.permission_overwrites) {
                // @ts-expect-error Intended to avoid .map
                    overwrite.channelId = payload.data.d.id;

                    // @ts-expect-error Intended to avoid .map
                    overwrite.userOrRole = overwrite.id;
                }

                await this.container.client.drizzle.insert(channelsOverwrite)
                    .values(payload.data.d.permission_overwrites)
                    .onConflictDoNothing({
                        target: [channelsOverwrite.userOrRole, channelsOverwrite.channelId]
                    });
            }
        }

        await DispatchListener.dispatch(payload);
    }
}
