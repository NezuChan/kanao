import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { channels, channelsOverwrite, guilds, memberRoles, roles, users, voiceStates } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import { chunk } from "@sapphire/utilities";
import type { GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
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

        const membersChunk = chunk(payload.data.d.members.filter(member => member.user !== undefined), 1_000);

        if (stateUsers) {
            for (const members of membersChunk) {
                await this.store.drizzle
                    .insert(users)
                    .values(
                        members
                            .map(member => ({
                                id: member.user!.id,
                                username: member.user!.username,
                                discriminator: member.user!.discriminator ?? null,
                                globalName: member.user!.global_name ?? null,
                                avatar: member.user!.avatar ?? null,
                                bot: member.user!.bot ?? false,
                                flags: member.user!.flags,
                                premiumType: member.user!.premium_type,
                                publicFlags: member.user!.public_flags
                            }))
                    )
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
                    });
            }
        }

        if (stateMembers) {
            for (const members of membersChunk) {
                await this.store.drizzle
                    .insert(users)
                    .values(
                        members
                            .map(member => ({
                                id: member.user!.id,
                                username: member.user!.username,
                                discriminator: member.user!.discriminator ?? null,
                                globalName: member.user!.global_name ?? null,
                                avatar: member.user!.avatar ?? null,
                                bot: member.user!.bot ?? false,
                                flags: member.user!.flags,
                                premiumType: member.user!.premium_type,
                                publicFlags: member.user!.public_flags
                            }))
                    )
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
                    });

                for (const member of members) {
                    if (member.roles.length > 0) {
                        await this.store.drizzle.insert(memberRoles)
                            .values(member.roles.map(role => ({
                                memberId: member.user!.id,
                                roleId: role,
                                guildId: payload.data.d.id
                            }))).onConflictDoNothing({ target: [memberRoles.memberId, memberRoles.roleId] });
                    }
                }
            }
        }

        if (stateChannels && payload.data.d.channels.length > 0) {
            const chunks = chunk(payload.data.d.channels, 1_000);

            for (const chChunk of chunks) {
                await this.store.drizzle
                    .insert(channels)
                    .values(
                        chChunk.map(channel => ({
                            id: channel.id,
                            guildId: payload.data.d.id,
                            name: channel.name,
                            type: channel.type,
                            flags: channel.flags
                        }))
                    )
                    .onConflictDoNothing({ target: channels.id });

                for (const ch of chChunk) {
                    if (
                        "permission_overwrites" in ch &&
                        (ch.permission_overwrites?.length ?? 0) > 0
                    ) {
                        const overwritesChunk = chunk(ch.permission_overwrites ?? [], 1_000);
                        for (const overwrites of overwritesChunk) {
                            await this.store.drizzle
                                .insert(channelsOverwrite)
                                .values(
                                    overwrites.map(overwrite => ({
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
            }
        }

        if (stateVoices) {
            const chunks = chunk(payload.data.d.voice_states.filter(x => x.channel_id !== null), 1_000);
            for (const states of chunks) {
                await this.store.drizzle
                    .insert(voiceStates)
                    .values(
                        states.map(voice => ({
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
                        target: voiceStates.memberId,
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
        }

        await this.store.amqp.publish(
            RabbitMQ.GATEWAY_QUEUE_SEND,
            RoutingKey(clientId, payload.shardId),
            Buffer.from(JSON.stringify(payload.data))
        );
    }
}
