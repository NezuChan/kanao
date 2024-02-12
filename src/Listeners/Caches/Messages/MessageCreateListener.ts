import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayMessageCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { memberRoles, members, messages, users } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateMembers, stateMessages, stateUsers } from "../../../config.js";

export class MessageCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageCreate
        });
    }

    public async run(payload: { data: GatewayMessageCreateDispatch; shardId: number; }): Promise<void> {
        if (stateMessages) {
            await this.store.drizzle.insert(messages).values({
                id: payload.data.d.id,
                channelId: payload.data.d.channel_id,
                content: payload.data.d.content,
                applicationId: payload.data.d.application_id,
                authorId: payload.data.d.author.id,
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
            }).onConflictDoNothing({ target: messages.id });
        }

        if (stateUsers) {
            await this.store.drizzle.insert(users).values({
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
                }
            });
        }

        if (stateMembers && payload.data.d.member !== undefined) {
            await this.store.drizzle.insert(members).values({
                id: payload.data.d.author.id,
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

                    avatar: payload.data.d.member.avatar,
                    flags: payload.data.d.member.flags,
                    joinedAt: payload.data.d.member.joined_at,
                    nick: payload.data.d.member.nick,
                    communicationDisabledUntil: payload.data.d.member.communication_disabled_until,
                    deaf: payload.data.d.member.deaf,
                    mute: payload.data.d.member.mute,
                    pending: payload.data.d.member.pending,
                    premiumSince: payload.data.d.member.premium_since
                }
            });

            await this.store.drizzle.delete(memberRoles).where(eq(memberRoles.id, payload.data.d.author.id));

            for (const role of payload.data.d.member.roles) {
                await this.store.drizzle.insert(memberRoles).values({
                    id: payload.data.d.author.id,
                    roleId: role
                }).onConflictDoNothing({ target: memberRoles.id });
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
