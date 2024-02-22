import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { channels, channelsOverwrite, guilds, memberRoles, members, roles, users, voiceStates } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, guildCreateGcEvery, stateChannels, stateRoles } from "../../../config.js";

export class GuildCreateListener extends Listener {
    public count = 0;
    public gcEvery = guildCreateGcEvery;
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

        // Removing unnecessary data from the payload
        // @ts-expect-error deallocate value
        payload.data.d.presences = null;

        // @ts-expect-error deallocate value
        payload.data.d.emojis = null;

        // @ts-expect-error deallocate value
        payload.data.d.stickers = null;

        // @ts-expect-error deallocate value
        payload.data.d.threads = null;

        await this.container.client.drizzle
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
                    unavailable: sql`EXCLUDED.unavailable`,
                    name: sql`EXCLUDED.name`,
                    banner: sql`EXCLUDED.banner`,
                    owner: sql`EXCLUDED.owner`,
                    ownerId: sql`EXCLUDED.owner_id`,
                    afkChannelId: sql`EXCLUDED.afk_channel_id`,
                    afkTimeout: sql`EXCLUDED.afk_timeout`,
                    defaultMessageNotifications: sql`EXCLUDED.default_message_notifications`,
                    explicitContentFilter: sql`EXCLUDED.explicit_content_filter`,
                    icon: sql`EXCLUDED.icon`,
                    mfaLevel: sql`EXCLUDED.mfa_level`,
                    region: sql`EXCLUDED.region`,
                    systemChannelId: sql`EXCLUDED.system_channel_id`,
                    verificationLevel: sql`EXCLUDED.verification_level`,
                    widgetChannelId: sql`EXCLUDED.widget_channel_id`,
                    widgetEnabled: sql`EXCLUDED.widget_enabled`,
                    approximateMemberCount: sql`EXCLUDED.approximate_member_count`,
                    approximatePresenceCount: sql`EXCLUDED.approximate_presence_count`,
                    description: sql`EXCLUDED.description`,
                    discoverySplash: sql`EXCLUDED.discovery_splash`,
                    iconHash: sql`EXCLUDED.icon_hash`,
                    maxMembers: sql`EXCLUDED.max_members`,
                    maxPresences: sql`EXCLUDED.max_presences`,
                    premiumSubscriptionCount: sql`EXCLUDED.premium_subscription_count`,
                    premiumTier: sql`EXCLUDED.premium_tier`,
                    vanityUrlCode: sql`EXCLUDED.vanity_url_code`,
                    nsfwLevel: sql`EXCLUDED.nsfw_level`,
                    rulesChannelId: sql`EXCLUDED.rules_channel_id`,
                    publicUpdatesChannelId: sql`EXCLUDED.public_updates_channel_id`,
                    preferredLocale: sql`EXCLUDED.preferred_locale`,
                    maxVideoChannelUsers: sql`EXCLUDED.max_video_channel_users`,
                    permissions: sql`EXCLUDED.permissions`,
                    premiumProgressBarEnabled: sql`EXCLUDED.premium_progress_bar_enabled`,
                    safetyAlertChannelId: sql`EXCLUDED.safety_alerts_channel_id`,
                    splash: sql`EXCLUDED.splash`,
                    systemChannelFlags: sql`EXCLUDED.system_channel_flags`
                }
            });

        if (stateRoles) {
            for (const role of payload.data.d.roles) {
                // @ts-expect-error Intended to avoid .map
                role.guildId = payload.data.d.id;
            }
            await this.container.client.drizzle.insert(roles)
                .values(payload.data.d.roles)
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

        // @ts-expect-error deallocate array
        // eslint-disable-next-line require-atomic-updates
        payload.data.d.roles = null;

        const bot = payload.data.d.members.find(member => member.user?.id === clientId)!;

        await this.container.client.drizzle
            .insert(users)
            .values({
                ...bot.user!,
                globalName: bot.user!.global_name ?? null,
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
            });

        await this.container.client.drizzle.insert(members)
            .values({
                ...bot,
                id: bot.user!.id,
                guildId: payload.data.d.id,
                communicationDisabledUntil: bot.communication_disabled_until,
                joinedAt: bot.joined_at,
                premiumSince: bot.premium_since
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

        if (bot.roles.length > 0) {
            await this.container.client.drizzle.insert(memberRoles)
                .values(bot.roles.map(role => ({
                    memberId: bot.user!.id,
                    roleId: role,
                    guildId: payload.data.d.id
                })).filter(role => role.roleId !== null))
                .onConflictDoNothing({ target: [memberRoles.memberId, memberRoles.roleId] });
        }

        // @ts-expect-error deallocate array
        // eslint-disable-next-line require-atomic-updates
        bot.roles = null;

        // @ts-expect-error deallocate array
        // eslint-disable-next-line require-atomic-updates
        payload.data.d.members = null;

        if (stateChannels && payload.data.d.channels.length > 0) {
            for (const ch of payload.data.d.channels) {
                // @ts-expect-error Intended to avoid .map
                ch.guildId = payload.data.d.id;

                if (
                    "permission_overwrites" in ch &&
                    ch.permission_overwrites !== undefined &&
                    ch.permission_overwrites.length > 0
                ) {
                    for (const overwrite of ch.permission_overwrites) {
                        // @ts-expect-error Intended to avoid .map
                        overwrite.channelId = ch.id;

                        // @ts-expect-error Intended to avoid .map
                        overwrite.userOrRole = overwrite.id;
                    }
                }
            }

            await this.container.client.drizzle.insert(channels)
                .values(payload.data.d.channels)
                .onConflictDoUpdate({
                    target: channels.id,
                    set: {
                        name: sql`EXCLUDED.name`,
                        type: sql`EXCLUDED.type`,
                        flags: sql`EXCLUDED.flags`
                    }
                });

            for (const ch of payload.data.d.channels) {
                if (
                    "permission_overwrites" in ch &&
                    ch.permission_overwrites !== undefined &&
                    ch.permission_overwrites.length > 0
                ) {
                    await this.container.client.drizzle.insert(channelsOverwrite)
                        .values(ch.permission_overwrites)
                        .onConflictDoNothing({
                            target: [channelsOverwrite.userOrRole, channelsOverwrite.channelId]
                        });
                }
            }
        }

        // @ts-expect-error deallocate array
        // eslint-disable-next-line require-atomic-updates
        payload.data.d.channels = null;

        const voiceState = payload.data.d.voice_states.find(voice => voice.user_id === clientId && voice.channel_id !== undefined);

        if (voiceState) {
            await this.container.client.drizzle
                .insert(voiceStates)
                .values({
                    memberId: voiceState.user_id,
                    guildId: payload.data.d.id,
                    channelId: voiceState.channel_id!,
                    sessionId: voiceState.session_id,
                    deaf: voiceState.deaf,
                    mute: voiceState.mute,
                    requestToSpeakTimestamp: voiceState.request_to_speak_timestamp,
                    selfDeaf: voiceState.self_deaf,
                    selfMute: voiceState.self_mute,
                    selfStream: voiceState.self_stream,
                    selfVideo: voiceState.self_video,
                    suppress: voiceState.suppress
                })
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

        // @ts-expect-error deallocate array
        // eslint-disable-next-line require-atomic-updates
        payload.data.d.voice_states = null;

        await this.container.client.amqp.publish(
            RabbitMQ.GATEWAY_QUEUE_SEND,
            RoutingKey(clientId, payload.shardId),
            Buffer.from(JSON.stringify(payload.data))
        );

        this.count++;

        if (global.gc && this.count % this.gcEvery === 0) {
            this.logger.info(`Running garbage collection in ${payload.shardId}, ${this.count} Guilds flushed to the database so far`);
            global.gc();
        }
    }
}
