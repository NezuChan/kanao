import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { memberRoles, members, users, voiceStates } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import { Result } from "@sapphire/result";
import type { GatewayVoiceStateUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { and, eq } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateMembers, stateUsers, stateVoices } from "../../../config.js";

export class VoiceStateUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.VoiceStateUpdate
        });
    }

    public async run(payload: { data: GatewayVoiceStateUpdateDispatch; shardId: number; }): Promise<void> {
        if (stateUsers && payload.data.d.member?.user !== undefined) {
            await this.store.drizzle.insert(users).values({
                id: payload.data.d.member.user.id,
                username: payload.data.d.member.user.username,
                discriminator: payload.data.d.member.user.discriminator ?? null,
                globalName: payload.data.d.member.user.global_name ?? null,
                avatar: payload.data.d.member.user.avatar ?? null,
                bot: payload.data.d.member.user.bot ?? false,
                flags: payload.data.d.member.user.flags,
                accentColor: payload.data.d.member.user.accent_color,
                avatarDecoration: payload.data.d.member.user.avatar_decoration,
                banner: payload.data.d.member.user.banner,
                locale: payload.data.d.member.user.locale,
                mfaEnabled: payload.data.d.member.user.mfa_enabled,
                premiumType: payload.data.d.member.user.premium_type,
                publicFlags: payload.data.d.member.user.public_flags
            }).onConflictDoNothing({ target: users.id });
        }

        if (stateMembers && payload.data.d.member !== undefined) {
            await this.store.drizzle.insert(members).values({
                id: payload.data.d.user_id,
                guildId: payload.data.d.guild_id,
                avatar: payload.data.d.member.avatar,
                flags: payload.data.d.member.flags,
                communicationDisabledUntil: payload.data.d.member.premium_since,
                deaf: payload.data.d.member.deaf,
                joinedAt: payload.data.d.member.joined_at,
                mute: payload.data.d.member.mute,
                nick: payload.data.d.member.nick,
                pending: payload.data.d.member.pending,
                premiumSince: payload.data.d.member.premium_since
            }).onConflictDoNothing({ target: members.id });

            await Promise.all(payload.data.d.member.roles.map(async role => Result.fromAsync(async () => {
                await this.store.drizzle.insert(memberRoles).values({
                    memberId: payload.data.d.user_id,
                    roleId: role
                }).onConflictDoNothing({ target: [memberRoles.memberId, memberRoles.roleId] });
            })));
        }

        if (stateVoices) {
            await (payload.data.d.channel_id === null
                ? this.store.drizzle.delete(voiceStates).where(and(eq(voiceStates.memberId, payload.data.d.user_id), eq(voiceStates.guildId, payload.data.d.guild_id!)))
                : this.store.drizzle.insert(voiceStates).values({
                    memberId: payload.data.d.user_id,
                    guildId: payload.data.d.guild_id!,
                    channelId: payload.data.d.channel_id,
                    sessionId: payload.data.d.session_id,
                    deaf: payload.data.d.deaf,
                    mute: payload.data.d.mute,
                    requestToSpeakTimestamp: payload.data.d.request_to_speak_timestamp,
                    selfDeaf: payload.data.d.self_deaf,
                    selfMute: payload.data.d.self_mute,
                    selfStream: payload.data.d.self_stream,
                    selfVideo: payload.data.d.self_video,
                    suppress: payload.data.d.suppress
                }).onConflictDoUpdate({
                    target: [voiceStates.memberId, voiceStates.guildId],
                    set: {
                        guildId: payload.data.d.guild_id,
                        channelId: payload.data.d.channel_id,
                        sessionId: payload.data.d.session_id,
                        deaf: payload.data.d.deaf,
                        mute: payload.data.d.mute,
                        requestToSpeakTimestamp: payload.data.d.request_to_speak_timestamp,
                        selfDeaf: payload.data.d.self_deaf,
                        selfMute: payload.data.d.self_mute,
                        selfStream: payload.data.d.self_stream,
                        selfVideo: payload.data.d.self_video,
                        suppress: payload.data.d.suppress
                    }
                }));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
