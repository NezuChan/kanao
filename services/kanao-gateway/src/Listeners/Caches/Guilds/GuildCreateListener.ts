/* eslint-disable @typescript-eslint/no-shadow */
import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { guilds, memberRoles, members, users, voiceStates } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import { chunk } from "@sapphire/utilities";
import type { GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateChannels, stateRoles } from "../../../config.js";

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

        this.logger.debug(`Received GUILD_CREATE event for guild ${payload.data.d.id}`);

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

        this.logger.debug(`Inserted guild ${payload.data.d.id} into the database`);

        if (stateRoles) {
            this.logger.debug(`Inserting ${payload.data.d.roles.length} roles for guild ${payload.data.d.id} into the database`);
            const values = sql.empty();

            for (const role of payload.data.d.roles) {
                values.append(sql`${values.queryChunks.length === 0 ? undefined : sql.raw(", ")}(${role.id}, ${role.name}, ${role.permissions}, ${role.position}, ${role.color}, ${role.hoist}, ${payload.data.d.id})`);
            }

            await this.store.drizzle.execute(
                sql.join([
                    sql`INSERT INTO roles (id, name, permissions, position, color, hoist, guild_id) VALUES `,
                    values,
                    sql` ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, permissions = EXCLUDED.permissions, position = EXCLUDED.position, color = EXCLUDED.color, hoist = EXCLUDED.hoist`
                ])
            );

            this.logger.debug(`Inserted ${payload.data.d.roles.length} roles for guild ${payload.data.d.id} into the database`);
        }

        const bot = payload.data.d.members.find(member => member.user?.id === clientId)!;

        this.logger.debug(`Inserting bot ${bot.user!.id} into the database`);

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

        this.logger.debug(`Inserted bot ${bot.user!.id} into the database`);

        if (stateChannels && payload.data.d.channels.length > 0) {
            this.logger.debug(`Inserting ${payload.data.d.channels.length} channels for guild ${payload.data.d.id} into the database`);
            const values = sql.empty();

            for (const channel of payload.data.d.channels) {
                values.append(sql`${values.queryChunks.length === 0 ? undefined : sql.raw(", ")}(${channel.id}, ${payload.data.d.id}, ${channel.name}, ${channel.type}, ${channel.flags})`);
            }

            const chunks = chunk(values.queryChunks, 32);

            for (const valueChunk of chunks) {
                await this.store.drizzle.execute(
                    sql.join([
                        sql`INSERT INTO channels (id, guild_id, name, type, flags) VALUES `,
                        valueChunk,
                        sql` ON CONFLICT ("id") DO NOTHING`
                    ])
                );
            }

            for (const ch of payload.data.d.channels) {
                if (
                    "permission_overwrites" in ch &&
                    ch.permission_overwrites !== undefined &&
                    ch.permission_overwrites.length > 0
                ) {
                    const values2 = sql.empty();

                    for (const overwrite of ch.permission_overwrites) {
                        values2.append(sql`${values2.queryChunks.length === 0 ? undefined : sql.raw(", ")}(${overwrite.id}, ${ch.id}, ${overwrite.type}, ${overwrite.allow}, ${overwrite.deny})`);
                    }

                    const chunks = chunk(values2.queryChunks, 6);
                    for (const valueChunk of chunks) {
                        await this.store.drizzle.execute(
                            sql.join([
                                sql`INSERT INTO channels_overwrite (user_or_role, channel_id, type, allow, deny) VALUES `,
                                valueChunk,
                                sql` ON CONFLICT ("user_or_role", "channel_id") DO NOTHING`
                            ])
                        );
                    }
                }
            }
            this.logger.debug(`Inserted ${payload.data.d.channels.length} channels for guild ${payload.data.d.id} into the database`);
        }

        const voiceState = payload.data.d.voice_states.find(voice => voice.user_id === clientId && voice.channel_id !== undefined);

        if (voiceState) {
            this.logger.debug(`Inserting voice state for bot ${bot.user!.id} in guild ${payload.data.d.id} into the database`);
            await this.store.drizzle
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
            this.logger.debug(`Inserted voice state for bot ${bot.user!.id} in guild ${payload.data.d.id} into the database`);
        }

        await this.store.amqp.publish(
            RabbitMQ.GATEWAY_QUEUE_SEND,
            RoutingKey(clientId, payload.shardId),
            Buffer.from(JSON.stringify(payload.data))
        );
    }
}
