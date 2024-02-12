import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { channels, channelsOverwrite, guilds, guildsChannels, guildsRoles, memberRoles, members, roles, users, voiceStates } from "../../../Schema/index.js";
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
            for (const role of payload.data.d.roles) {
                await this.store.drizzle.insert(roles).values({
                    id: role.id,
                    name: role.name,
                    permissions: role.permissions,
                    position: role.position,
                    color: role.color,
                    hoist: role.hoist
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

                await this.store.drizzle.insert(guildsRoles).values({
                    roleId: role.id,
                    id: payload.data.d.id
                }).onConflictDoNothing({ target: guildsRoles.id });
            }
        }

        for (const member of payload.data.d.members) {
            if (stateUsers && member.user !== undefined) {
                await this.store.drizzle.insert(users).values({
                    id: member.user.id,
                    username: member.user.username,
                    discriminator: member.user?.discriminator ?? null,
                    globalName: member.user?.global_name ?? null,
                    avatar: member.user?.avatar ?? null,
                    bot: member.user?.bot ?? false,
                    flags: member.user?.flags,
                    premiumType: member.user?.premium_type,
                    publicFlags: member.user?.public_flags
                }).onConflictDoUpdate({
                    target: users.id,
                    set: {
                        username: member.user.username,
                        discriminator: member.user?.discriminator ?? null,
                        globalName: member.user?.global_name ?? null,
                        avatar: member.user?.avatar ?? null,
                        bot: member.user?.bot ?? false,
                        flags: member.user?.flags,
                        premiumType: member.user?.premium_type,
                        publicFlags: member.user?.public_flags
                    }
                });
            }

            if (stateMembers && member.user !== undefined) {
                await this.store.drizzle.insert(members).values({
                    id: member.user.id,
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

                for (const role of member.roles) {
                    await this.store.drizzle.insert(memberRoles).values({
                        id: member.user.id,
                        roleId: role
                    }).onConflictDoNothing({ target: memberRoles.id });
                }
            }
        }

        if (stateChannels) {
            for (const channel of payload.data.d.channels) {
                await this.store.drizzle.insert(channels).values({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    flags: channel.flags
                }).onConflictDoNothing({ target: channels.id });

                if ("permission_overwrites" in channel && channel.permission_overwrites !== undefined) {
                    await this.store.drizzle.delete(channelsOverwrite).where(eq(channelsOverwrite.id, channel.id));
                    for (const overwrite of channel.permission_overwrites) {
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

                await this.store.drizzle.insert(guildsChannels).values({
                    id: channel.id,
                    guildId: payload.data.d.id
                }).onConflictDoNothing({ target: guildsChannels.id });
            }
        }

        if (stateVoices) {
            for (const voice of payload.data.d.voice_states) {
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
                    }).onConflictDoUpdate({ target: voiceStates.channelId, set: { sessionId: voice.session_id } });
                }
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
