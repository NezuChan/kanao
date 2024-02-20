import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { channels, channelsOverwrite, guilds, memberRoles, members, roles, users, voiceStates } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateChannels, stateRoles, stateVoices } from "../../../config.js";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildCreate
        });
    }

    public async run(payload: { data: GatewayGuildCreateDispatch; shardId: number; }): Promise<void> {
        if (
            payload.data.d.unavailable !== undefined &&
            payload.data.d.unavailable
        ) return;

        await this.store.drizzle
            .insert(guilds)
            .values({
                id: payload.data.d.id,
                unavailable: payload.data.d.unavailable,
                name: payload.data.d.name,
                banner: payload.data.d.banner,
                owner: payload.data.d.owner,
                ownerId: payload.data.d.owner_id,
                afkChannelId: payload.data.d.afk_channel_id,
                afkTimeout: payload.data.d.afk_timeout,
                defaultMessageNotifications: payload.data.d.default_message_notifications,
                explicitContentFilter: payload.data.d.explicit_content_filter,
                icon: payload.data.d.icon,
                mfaLevel: payload.data.d.mfa_level,
                region: payload.data.d.region,
                systemChannelId: payload.data.d.system_channel_id,
                verificationLevel: payload.data.d.verification_level,
                widgetChannelId: payload.data.d.widget_channel_id,
                widgetEnabled: payload.data.d.widget_enabled,
                approximateMemberCount: payload.data.d.approximate_member_count,
                approximatePresenceCount: payload.data.d.approximate_presence_count,
                description: payload.data.d.description,
                discoverySplash: payload.data.d.discovery_splash,
                iconHash: payload.data.d.icon_hash,
                maxMembers: payload.data.d.max_members,
                maxPresences: payload.data.d.max_presences,
                premiumSubscriptionCount: payload.data.d.premium_subscription_count,
                premiumTier: payload.data.d.premium_tier,
                vanityUrlCode: payload.data.d.vanity_url_code,
                nsfwLevel: payload.data.d.nsfw_level,
                rulesChannelId: payload.data.d.rules_channel_id,
                publicUpdatesChannelId: payload.data.d.public_updates_channel_id,
                preferredLocale: payload.data.d.preferred_locale,
                maxVideoChannelUsers: payload.data.d.max_video_channel_users,
                permissions: payload.data.d.permissions,
                premiumProgressBarEnabled: payload.data.d.premium_progress_bar_enabled,
                safetyAlertChannelId: payload.data.d.safety_alerts_channel_id,
                splash: payload.data.d.splash,
                systemChannelFlags: payload.data.d.system_channel_flags
            })
            .onConflictDoUpdate({
                target: guilds.id,
                set: {
                    unavailable: payload.data.d.unavailable,
                    name: payload.data.d.name,
                    banner: payload.data.d.banner,
                    owner: payload.data.d.owner,
                    ownerId: payload.data.d.owner_id,
                    afkChannelId: payload.data.d.afk_channel_id,
                    afkTimeout: payload.data.d.afk_timeout,
                    defaultMessageNotifications: payload.data.d.default_message_notifications,
                    explicitContentFilter: payload.data.d.explicit_content_filter,
                    icon: payload.data.d.icon,
                    mfaLevel: payload.data.d.mfa_level,
                    region: payload.data.d.region,
                    systemChannelId: payload.data.d.system_channel_id,
                    verificationLevel: payload.data.d.verification_level,
                    widgetChannelId: payload.data.d.widget_channel_id,
                    widgetEnabled: payload.data.d.widget_enabled,
                    approximateMemberCount: payload.data.d.approximate_member_count,
                    approximatePresenceCount: payload.data.d.approximate_presence_count,
                    description: payload.data.d.description,
                    discoverySplash: payload.data.d.discovery_splash,
                    iconHash: payload.data.d.icon_hash,
                    maxMembers: payload.data.d.max_members,
                    maxPresences: payload.data.d.max_presences,
                    premiumSubscriptionCount: payload.data.d.premium_subscription_count,
                    premiumTier: payload.data.d.premium_tier,
                    vanityUrlCode: payload.data.d.vanity_url_code,
                    nsfwLevel: payload.data.d.nsfw_level,
                    rulesChannelId: payload.data.d.rules_channel_id,
                    publicUpdatesChannelId: payload.data.d.public_updates_channel_id,
                    preferredLocale: payload.data.d.preferred_locale,
                    maxVideoChannelUsers: payload.data.d.max_video_channel_users,
                    permissions: payload.data.d.permissions,
                    premiumProgressBarEnabled: payload.data.d.premium_progress_bar_enabled,
                    safetyAlertChannelId: payload.data.d.safety_alerts_channel_id,
                    splash: payload.data.d.splash,
                    systemChannelFlags: payload.data.d.system_channel_flags
                }
            });

        if (stateRoles) {
            await this.store.drizzle
                .insert(roles)
                .values(
                    payload.data.d.roles.map(role => ({
                        id: role.id,
                        name: role.name,
                        permissions: role.permissions,
                        position: role.position,
                        color: role.color,
                        hoist: role.hoist,
                        guildId: payload.data.d.id
                    }))
                )
                .onConflictDoUpdate({
                    target: roles.id,
                    set: {
                        name: sql`EXCLUDED.name`,
                        permissions: sql`EXCLUDED.permissions`,
                        position: sql`EXCLUDED.position`,
                        color: sql`EXCLUDED.color`,
                        hoist: sql`EXCLUDED.hoist`
                    }
                });
        }

        const bot = payload.data.d.members.find(member => member.user?.id === clientId)!;

        await this.store.drizzle
            .insert(users)
            .values({
                id: bot.user!.id,
                username: bot.user!.username,
                discriminator: bot.user!.discriminator ?? null,
                globalName: bot.user!.global_name ?? null,
                avatar: bot.user!.avatar ?? null,
                bot: bot.user!.bot ?? false,
                flags: bot.user!.flags,
                premiumType: bot.user!.premium_type,
                publicFlags: bot.user!.public_flags
            })
            .onConflictDoUpdate({
                target: users.id,
                set: {
                    username: sql`EXCLUDED.username`,
                    discriminator: sql`EXCLUDED.discriminator`,
                    globalName: sql`EXCLUDED.global_name`,
                    avatar: sql`EXCLUDED.avatar`,
                    bot: sql`EXCLUDED.bot`,
                    flags: sql`EXCLUDED.flags`,
                    premiumType: sql`EXCLUDED.premium_type`,
                    publicFlags: sql`EXCLUDED.public_flags`
                }
            })
            .execute();

        await this.store.drizzle.insert(members)
            .values({
                id: bot.user!.id,
                guildId: payload.data.d.id,
                avatar: bot.avatar,
                flags: bot.flags,
                communicationDisabledUntil: bot.communication_disabled_until,
                deaf: bot.deaf,
                joinedAt: bot.joined_at,
                mute: bot.mute,
                nick: bot.nick,
                pending: bot.pending,
                premiumSince: bot.premium_since
            }).onConflictDoUpdate({
                target: members.id,
                set: {
                    avatar: bot.avatar,
                    flags: bot.flags,
                    communicationDisabledUntil: bot.communication_disabled_until,
                    deaf: bot.deaf,
                    joinedAt: bot.joined_at,
                    mute: bot.mute,
                    nick: bot.nick,
                    pending: bot.pending,
                    premiumSince: bot.premium_since
                }
            });

        if (bot.roles.length > 0) {
            await this.store.drizzle.insert(memberRoles)
                .values(bot.roles.map(role => ({
                    memberId: bot.user!.id,
                    roleId: role,
                    guildId: payload.data.d.id
                })).filter(role => role.roleId !== null))
                .onConflictDoNothing({ target: [memberRoles.memberId, memberRoles.roleId] });
        }

        if (stateChannels && payload.data.d.channels.length > 0) {
            await this.store.drizzle
                .insert(channels)
                .values(
                    payload.data.d.channels.map(channel => ({
                        id: channel.id,
                        guildId: payload.data.d.id,
                        name: channel.name,
                        type: channel.type,
                        flags: channel.flags
                    }))
                )
                .onConflictDoNothing({ target: channels.id });
            for (const ch of payload.data.d.channels) {
                if (
                    "permission_overwrites" in ch &&
                    ch.permission_overwrites !== undefined &&
                    ch.permission_overwrites.length > 0
                ) {
                    await this.store.drizzle
                        .insert(channelsOverwrite)
                        .values(
                            ch.permission_overwrites.map(overwrite => ({
                                userOrRole: overwrite.id,
                                channelId: ch.id,
                                type: overwrite.type,
                                allow: overwrite.allow,
                                deny: overwrite.deny
                            }))
                        )
                        .onConflictDoNothing({
                            target: [channelsOverwrite.userOrRole, channelsOverwrite.channelId]
                        });
                }
            }
        }

        if (stateVoices && payload.data.d.voice_states.length > 0) {
            await this.store.drizzle
                .insert(voiceStates)
                .values(
                    payload.data.d.voice_states.map(voice => ({
                        channelId: voice.channel_id!,
                        guildId: payload.data.d.id,
                        sessionId: voice.session_id,
                        memberId: voice.user_id,
                        deaf: voice.deaf,
                        mute: voice.mute,
                        requestToSpeakTimestamp: voice.request_to_speak_timestamp,
                        selfDeaf: voice.self_deaf,
                        selfMute: voice.self_mute,
                        selfStream: voice.self_stream,
                        selfVideo: voice.self_video,
                        suppress: voice.suppress
                    }))
                )
                .onConflictDoUpdate({
                    target: [voiceStates.memberId, voiceStates.guildId],
                    set: {
                        channelId: sql`EXCLUDED.channel_id`,
                        sessionId: sql`EXCLUDED.session_id`,
                        deaf: sql`EXCLUDED.deaf`,
                        mute: sql`EXCLUDED.mute`,
                        requestToSpeakTimestamp: sql`EXCLUDED.request_to_speak_timestamp`,
                        selfDeaf: sql`EXCLUDED.self_deaf`,
                        selfMute: sql`EXCLUDED.self_mute`,
                        selfStream: sql`EXCLUDED.self_stream`,
                        selfVideo: sql`EXCLUDED.self_video`,
                        suppress: sql`EXCLUDED.suppress`
                    }
                });
        }

        await this.store.amqp.publish(
            RabbitMQ.GATEWAY_QUEUE_SEND,
            RoutingKey(clientId, payload.shardId),
            Buffer.from(JSON.stringify(payload.data))
        );
    }
}
