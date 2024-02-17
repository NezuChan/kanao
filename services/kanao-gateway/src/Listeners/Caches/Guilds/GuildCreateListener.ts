import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { channels, channelsOverwrite, guilds, memberRoles, members, roles, users, voiceStates } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import { Result } from "@sapphire/result";
import type { GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateChannels, stateMembers, stateRoles, stateUsers, stateVoices } from "../../../config.js";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildCreate
        });
    }

    public async run(payload: { data: GatewayGuildCreateDispatch; shardId: number; }): Promise<void> {
        if (payload.data.d.unavailable !== undefined && payload.data.d.unavailable) return;

        await this.store.drizzle.insert(guilds).values({
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
        }).onConflictDoUpdate({
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
            await Promise.all(payload.data.d.roles.map(async role => Result.fromAsync(async () => {
                await this.store.drizzle.insert(roles).values({
                    id: role.id,
                    name: role.name,
                    permissions: role.permissions,
                    position: role.position,
                    color: role.color,
                    hoist: role.hoist,
                    guildId: payload.data.d.id
                }).onConflictDoUpdate({
                    target: roles.id,
                    set: {
                        name: role.name,
                        permissions: role.permissions,
                        position: role.position,
                        color: role.color,
                        hoist: role.hoist
                    }
                });
            })));
        }

        await Promise.all(payload.data.d.members.map(async member => Result.fromAsync(async () => {
            if (stateUsers && member.user !== undefined) {
                await this.store.drizzle.insert(users).values({
                    id: member.user.id,
                    username: member.user.username,
                    discriminator: member.user.discriminator ?? null,
                    globalName: member.user.global_name ?? null,
                    avatar: member.user.avatar ?? null,
                    bot: member.user.bot ?? false,
                    flags: member.user.flags,
                    premiumType: member.user.premium_type,
                    publicFlags: member.user.public_flags
                }).onConflictDoUpdate({
                    target: users.id,
                    set: {
                        username: member.user.username,
                        discriminator: member.user.discriminator ?? null,
                        globalName: member.user.global_name ?? null,
                        avatar: member.user.avatar ?? null,
                        bot: member.user.bot ?? false,
                        flags: member.user.flags,
                        premiumType: member.user.premium_type,
                        publicFlags: member.user.public_flags
                    }
                });
            }

            if (stateMembers && member.user !== undefined) {
                await this.store.drizzle.insert(members).values({
                    id: member.user.id,
                    guildId: payload.data.d.id,
                    avatar: member.avatar,
                    flags: member.flags,
                    communicationDisabledUntil: member.communication_disabled_until,
                    deaf: member.deaf,
                    joinedAt: member.joined_at,
                    mute: member.mute,
                    nick: member.nick,
                    pending: member.pending,
                    premiumSince: member.premium_since
                }).onConflictDoUpdate({
                    target: members.id,
                    set: {
                        avatar: member.avatar,
                        flags: member.flags,
                        communicationDisabledUntil: member.communication_disabled_until,
                        deaf: member.deaf,
                        joinedAt: member.joined_at,
                        mute: member.mute,
                        nick: member.nick,
                        pending: member.pending,
                        premiumSince: member.premium_since
                    }
                });

                await Promise.all(member.roles.map(async role => Result.fromAsync(() => this.store.drizzle.insert(memberRoles).values({
                    memberId: member.user!.id,
                    roleId: role,
                    guildId: payload.data.d.id
                }).onConflictDoNothing({ target: [memberRoles.memberId, memberRoles.roleId] }))));
            }
        })));

        if (stateChannels) {
            await Promise.all(payload.data.d.channels.map(async channel => Result.fromAsync(async () => {
                await this.store.drizzle.insert(channels).values({
                    id: channel.id,
                    guildId: payload.data.d.id,
                    name: channel.name,
                    type: channel.type,
                    flags: channel.flags
                }).onConflictDoNothing({ target: channels.id });

                if ("permission_overwrites" in channel && channel.permission_overwrites !== undefined) {
                    await Promise.all(channel.permission_overwrites?.map(async overwrite => {
                        await this.store.drizzle.insert(channelsOverwrite).values({
                            userOrRole: overwrite.id,
                            channelId: channel.id,
                            type: overwrite.type,
                            allow: overwrite.allow,
                            deny: overwrite.deny
                        }).onConflictDoNothing({
                            target: [channelsOverwrite.userOrRole, channelsOverwrite.channelId]
                        });
                    }));
                }
            })));
        }

        if (stateVoices) {
            await Promise.all(payload.data.d.voice_states.map(async voice => Result.fromAsync(async () => {
                if (voice.channel_id !== null) {
                    await this.store.drizzle.insert(voiceStates).values({
                        channelId: voice.channel_id,
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
                    }).onConflictDoUpdate({
                        target: voiceStates.memberId,
                        set: {
                            channelId: voice.channel_id,
                            sessionId: voice.session_id,
                            deaf: voice.deaf,
                            mute: voice.mute,
                            requestToSpeakTimestamp: voice.request_to_speak_timestamp,
                            selfDeaf: voice.self_deaf,
                            selfMute: voice.self_mute,
                            selfStream: voice.self_stream,
                            selfVideo: voice.self_video,
                            suppress: voice.suppress
                        }
                    });
                }
            })));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
