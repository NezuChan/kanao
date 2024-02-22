import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { memberRoles, members, messages, users } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayMessageUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateMembers, stateMessages, stateUsers } from "../../../config.js";

export class MessageUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageUpdate,
            enabled: stateMessages
        });
    }

    public async run(payload: { data: GatewayMessageUpdateDispatch; shardId: number; }): Promise<void> {
        if (stateUsers && payload.data.d.author !== undefined) {
            await this.container.client.drizzle.insert(users).values({
                id: payload.data.d.author.id,
                username: payload.data.d.author.username,
                discriminator: payload.data.d.author.discriminator ?? null,
                globalName: payload.data.d.author.global_name ?? null,
                avatar: payload.data.d.author.avatar ?? null,
                bot: payload.data.d.author.bot ?? false,
                flags: payload.data.d.flags,
                accentColor: payload.data.d.author.accent_color,
                avatarDecoration: payload.data.d.author.avatar_decoration,
                banner: payload.data.d.author.banner,
                locale: payload.data.d.author.locale,
                mfaEnabled: payload.data.d.author.mfa_enabled,
                premiumType: payload.data.d.author.premium_type,
                publicFlags: payload.data.d.author.public_flags
            }).onConflictDoUpdate({
                target: users.id,
                set: {
                    username: sql`EXCLUDED.username`,
                    discriminator: sql`EXCLUDED.discriminator`,
                    globalName: sql`EXCLUDED.global_name`,
                    avatar: sql`EXCLUDED.avatar`,
                    bot: sql`EXCLUDED.bot`,
                    flags: sql`EXCLUDED.flags`,
                    accentColor: sql`EXCLUDED.accent_color`,
                    avatarDecoration: sql`EXCLUDED.avatar_decoration`,
                    banner: sql`EXCLUDED.banner`,
                    locale: sql`EXCLUDED.locale`,
                    mfaEnabled: sql`EXCLUDED.mfa_enabled`,
                    premiumType: sql`EXCLUDED.premium_type`,
                    publicFlags: sql`EXCLUDED.public_flags`
                }
            });
        }

        if (stateMembers && payload.data.d.member !== undefined && payload.data.d.author !== undefined) {
            await this.container.client.drizzle.insert(members).values({
                id: payload.data.d.author.id,
                guildId: payload.data.d.guild_id,
                avatar: payload.data.d.member.avatar,
                flags: payload.data.d.member.flags,
                joinedAt: payload.data.d.member.joined_at,
                nick: payload.data.d.member.nick,
                communicationDisabledUntil: payload.data.d.member.communication_disabled_until,
                deaf: payload.data.d.member.deaf,
                mute: payload.data.d.member.mute,
                pending: payload.data.d.member.pending,
                premiumSince: payload.data.d.member.premium_since
            }).onConflictDoUpdate({
                target: members.id,
                set: {
                    avatar: sql`EXCLUDED.avatar`,
                    flags: sql`EXCLUDED.flags`,
                    communicationDisabledUntil: sql`EXCLUDED.communication_disabled_until`,
                    deaf: sql`EXCLUDED.deaf`,
                    joinedAt: sql`EXCLUDED.joined_at`,
                    mute: sql`EXCLUDED.mute`,
                    nick: sql`EXCLUDED.nick`,
                    pending: sql`EXCLUDED.pending`,
                    premiumSince: sql`EXCLUDED.premium_since`
                }
            });

            if (payload.data.d.member.roles.length > 0) {
                await this.container.client.drizzle.insert(memberRoles).values(payload.data.d.member.roles.map(role => ({
                    memberId: payload.data.d.author!.id,
                    roleId: role,
                    guildId: payload.data.d.guild_id
                }))).onConflictDoNothing({ target: [memberRoles.memberId, memberRoles.roleId] });
            }
        }

        if (stateMessages) {
            await this.container.client.drizzle.insert(messages).values({
                id: payload.data.d.id,
                channelId: payload.data.d.channel_id,
                content: payload.data.d.content,
                applicationId: payload.data.d.application_id,
                authorId: payload.data.d.author?.id,
                editedTimestamp: payload.data.d.edited_timestamp,
                flags: payload.data.d.flags,
                type: payload.data.d.type,
                mentionEveryone: payload.data.d.mention_everyone,
                pinned: payload.data.d.pinned,
                position: payload.data.d.position,
                timestamp: payload.data.d.timestamp,
                tts: payload.data.d.tts,
                webhookId: payload.data.d.webhook_id,
                nonce: payload.data.d.nonce?.toString()
            }).onConflictDoUpdate({
                target: messages.id,
                set: {
                    channelId: sql`EXCLUDED.channel_id`,
                    content: sql`EXCLUDED.content`,
                    applicationId: sql`EXCLUDED.application_id`,
                    authorId: sql`EXCLUDED.author_id`,
                    editedTimestamp: sql`EXCLUDED.edited_timestamp`,
                    flags: sql`EXCLUDED.flags`,
                    type: sql`EXCLUDED.type`,
                    mentionEveryone: sql`EXCLUDED.mention_everyone`,
                    pinned: sql`EXCLUDED.pinned`,
                    position: sql`EXCLUDED.position`,
                    timestamp: sql`EXCLUDED.timestamp`,
                    tts: sql`EXCLUDED.tts`,
                    webhookId: sql`EXCLUDED.webhook_id`,
                    nonce: sql`EXCLUDED.nonce`
                }
            });
        }

        await this.container.client.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
