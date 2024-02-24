/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable stylistic/max-len */

import { Buffer } from "node:buffer";
import EventEmitter from "node:events";
import process from "node:process";
import { URLSearchParams } from "node:url";
import { REST } from "@discordjs/rest";
import { RabbitMQ, GatewayExchangeRoutes } from "@nezuchan/constants";
import * as schema from "@nezuchan/kanao-schema";
import { createAmqpChannel, RoutedQueue } from "@nezuchan/utilities";
import { Result } from "@sapphire/result";
import type { ChannelWrapper } from "amqp-connection-manager";
import type { Channel } from "amqplib";
import type { APIChannel, APIGuild, APIGuildMember, APIMessage, APIUser, RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { ChannelType, Routes } from "discord-api-types/v10";
import { and, eq, notInArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { Events } from "../Enums/Events.js";
import type { ClientOptions } from "../Typings/index.js";
import type { BaseChannel } from "./Channels/BaseChannel.js";
import { TextChannel } from "./Channels/TextChannel.js";
import { VoiceChannel } from "./Channels/VoiceChannel.js";
import { Guild } from "./Guild.js";
import { GuildMember } from "./GuildMember.js";
import { Message } from "./Message.js";
import { Role } from "./Role.js";
import { User } from "./User.js";
import { VoiceState } from "./VoiceState.js";

export class Client extends EventEmitter {
    public store: NodePgDatabase<typeof schema>;
    public storeBackend: pg.Pool;
    public clientId: string;
    public rest = new REST({
        api: process.env.HTTP_PROXY ?? process.env.PROXY ?? process.env.NIRN_PROXY ?? "https://discord.com/api",
        rejectOnRateLimit: (process.env.PROXY ?? process.env.NIRN_PROXY) === undefined ? null : () => false
    });

    public amqp!: ChannelWrapper;

    public constructor(
        public options: ClientOptions
    ) {
        super();

        if (options.rest) {
            this.rest.options.api = options.rest;
        }

        this.storeBackend = new pg.Pool({ connectionString: options.databaseUrl, max: options.databaseConnectionLimit ?? 10 });
        this.store = drizzle(this.storeBackend, { schema });

        options.token ??= process.env.DISCORD_TOKEN;
        this.clientId = Buffer.from(options.token!.split(".")[0], "base64").toString();
    }

    public connect(): void {
        this.amqp = createAmqpChannel(this.options.amqpUrl, {
            setup: async (channel: Channel) => this.setupAmqp(channel)
        });

        this.rest.setToken(this.options.token!);
    }

    public async setupAmqp(channel: Channel): Promise<void> {
        await channel.assertExchange(RabbitMQ.GATEWAY_EXCHANGE, "topic", { durable: false });

        const routing = new RoutedQueue(GatewayExchangeRoutes.DISPATCH, this.clientId, this.options.instanceName);

        const { queue } = await channel.assertQueue(routing.queue, { durable: false });
        await this.bindQueue(channel, RabbitMQ.GATEWAY_EXCHANGE, routing);

        await channel.consume(queue, message => {
            if (message) {
                channel.ack(message);
                this.emit(Events.RAW, JSON.parse(message.content.toString()));
            }
        });
    }

    public async resolveMember({ force = false, fetch = true, cache, id, guildId }: { force?: boolean | undefined; fetch?: boolean; cache?: boolean | undefined; id: string; guildId: string; }): Promise<GuildMember | undefined> {
        if (force) {
            const result = await Result.fromAsync<APIGuildMember>(async () => this.rest.get(Routes.guildMember(guildId, id)) as unknown as Promise<APIGuildMember>);
            if (result.isOk()) {
                const member = result.unwrap();
                if (cache) {
                    await this.store.insert(schema.users).values({
                        id: member.user!.id,
                        username: member.user!.username,
                        discriminator: member.user!.discriminator ?? null,
                        globalName: member.user!.global_name ?? null,
                        avatar: member.user!.avatar ?? null,
                        bot: member.user!.bot ?? false,
                        flags: member.user!.flags,
                        accentColor: member.user!.accent_color,
                        avatarDecoration: member.user!.avatar_decoration,
                        banner: member.user!.banner,
                        locale: member.user!.locale,
                        mfaEnabled: member.user!.mfa_enabled,
                        premiumType: member.user!.premium_type,
                        publicFlags: member.user!.public_flags
                    }).onConflictDoNothing({ target: schema.users.id });

                    await this.store.insert(schema.members).values({
                        id,
                        guildId,
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
                        target: schema.members.id,
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
                }
                return new GuildMember({
                    id,
                    guildId,
                    avatar: member.avatar ?? null,
                    flags: member.flags as unknown as number,
                    communicationDisabledUntil: member.communication_disabled_until ?? null,
                    deaf: member.deaf,
                    joinedAt: member.joined_at,
                    mute: member.mute,
                    nick: member.nick ?? null,
                    pending: member.pending ?? false,
                    premiumSince: member.premium_since ?? null
                }, this);
            }
        }

        const member = await this.store.query.members.findFirst({
            where: () => and(eq(schema.members.id, id), eq(schema.members.guildId, guildId))
        });

        if (member) {
            return new GuildMember(member, this);
        }

        if (fetch) {
            return this.resolveMember({ id, guildId, force: true, cache: true });
        }

        return undefined;
    }

    public async resolveUser({ force = false, fetch = true, cache, id }: { force?: boolean | undefined; fetch?: boolean; cache?: boolean | undefined; id: string; }): Promise<User | undefined> {
        if (force) {
            const result = await Result.fromAsync(async () => this.rest.get(Routes.user(id)));
            if (result.isOk()) {
                const user = result.unwrap() as APIUser;
                if (cache) {
                    await this.store.insert(schema.users).values({
                        id: user.id,
                        username: user.username,
                        discriminator: user?.discriminator ?? null,
                        globalName: user?.global_name ?? null,
                        avatar: user?.avatar ?? null,
                        bot: user?.bot ?? false,
                        flags: user?.flags,
                        accentColor: user?.accent_color,
                        avatarDecoration: user?.avatar_decoration,
                        banner: user?.banner,
                        locale: user?.locale,
                        mfaEnabled: user?.mfa_enabled,
                        premiumType: user?.premium_type,
                        publicFlags: user?.public_flags
                    }).onConflictDoNothing({ target: schema.users.id });
                }
                return new User({
                    id: user.id,
                    username: user.username,
                    discriminator: user.discriminator,
                    avatar: user.avatar,
                    banner: user.banner,
                    bot: user.bot,
                    accentColor: user.accent_color
                }, this);
            }
        }

        const user = await this.store.query.users.findFirst({
            where: () => eq(schema.users.id, id)
        });

        if (user) {
            return new User(user, this);
        }

        if (fetch) {
            return this.resolveUser({ id, force: true, cache: true });
        }

        return undefined;
    }

    public async resolveGuild({ force = false, fetch = true, withCounts = false, cache, id }: { force?: boolean | undefined; fetch?: boolean; cache?: boolean | undefined; id: string; withCounts?: boolean; }): Promise<Guild | undefined> {
        if (force) {
            const result = await Result.fromAsync(
                async () => this.rest.get(
                    Routes.guild(id),
                    withCounts ? { query: new URLSearchParams({ with_counts: "true" }) } : {}
                )
            );
            if (result.isOk()) {
                const guild = result.unwrap() as APIGuild;
                if (cache) {
                    await this.store.insert(schema.guilds).values({
                        id: guild.id,
                        name: guild.name,
                        banner: guild.banner,
                        owner: guild.owner,
                        ownerId: guild.owner_id,
                        afkChannelId: guild.afk_channel_id,
                        afkTimeout: guild.afk_timeout,
                        defaultMessageNotifications: guild.default_message_notifications,
                        explicitContentFilter: guild.explicit_content_filter,
                        icon: guild.icon,
                        mfaLevel: guild.mfa_level,
                        region: guild.region,
                        systemChannelId: guild.system_channel_id,
                        verificationLevel: guild.verification_level,
                        widgetChannelId: guild.widget_channel_id,
                        widgetEnabled: guild.widget_enabled,
                        approximateMemberCount: guild.approximate_member_count,
                        approximatePresenceCount: guild.approximate_presence_count,
                        description: guild.description,
                        discoverySplash: guild.discovery_splash,
                        iconHash: guild.icon_hash,
                        maxMembers: guild.max_members,
                        maxPresences: guild.max_presences,
                        premiumSubscriptionCount: guild.premium_subscription_count,
                        premiumTier: guild.premium_tier,
                        vanityUrlCode: guild.vanity_url_code,
                        nsfwLevel: guild.nsfw_level,
                        rulesChannelId: guild.rules_channel_id,
                        publicUpdatesChannelId: guild.public_updates_channel_id,
                        preferredLocale: guild.preferred_locale,
                        maxVideoChannelUsers: guild.max_video_channel_users,
                        permissions: guild.permissions,
                        premiumProgressBarEnabled: guild.premium_progress_bar_enabled,
                        safetyAlertChannelId: guild.safety_alerts_channel_id,
                        splash: guild.splash,
                        systemChannelFlags: guild.system_channel_flags
                    }).onConflictDoUpdate({
                        target: schema.guilds.id,
                        set: {
                            name: sql`EXCLIDED.name`,
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
                            safetyAlertChannelId: sql`EXCLUDED.safety_alert_channel_id`,
                            splash: sql`EXCLUDED.splash`,
                            systemChannelFlags: sql`EXCLUDED.system_channel_flags`
                        }
                    });
                }
                return new Guild({
                    id: guild.id,
                    name: guild.name,
                    banner: guild.banner,
                    owner: guild.owner,
                    ownerId: guild.owner_id,
                    afkChannelId: guild.afk_channel_id,
                    afkTimeout: guild.afk_timeout,
                    defaultMessageNotifications: guild.default_message_notifications,
                    explicitContentFilter: guild.explicit_content_filter,
                    icon: guild.icon,
                    mfaLevel: guild.mfa_level,
                    region: guild.region,
                    systemChannelId: guild.system_channel_id,
                    verificationLevel: guild.verification_level,
                    widgetChannelId: guild.widget_channel_id,
                    widgetEnabled: guild.widget_enabled,
                    approximateMemberCount: guild.approximate_member_count,
                    approximatePresenceCount: guild.approximate_presence_count,
                    description: guild.description,
                    discoverySplash: guild.discovery_splash,
                    iconHash: guild.icon_hash,
                    maxMembers: guild.max_members,
                    maxPresences: guild.max_presences,
                    premiumSubscriptionCount: guild.premium_subscription_count,
                    premiumTier: guild.premium_tier,
                    vanityUrlCode: guild.vanity_url_code,
                    nsfwLevel: guild.nsfw_level,
                    rulesChannelId: guild.rules_channel_id,
                    publicUpdatesChannelId: guild.public_updates_channel_id,
                    preferredLocale: guild.preferred_locale,
                    maxVideoChannelUsers: guild.max_video_channel_users,
                    permissions: guild.permissions,
                    premiumProgressBarEnabled: guild.premium_progress_bar_enabled,
                    safetyAlertChannelId: guild.safety_alerts_channel_id,
                    splash: guild.splash,
                    systemChannelFlags: guild.system_channel_flags
                }, this);
            }
        }

        const guild = await this.store.query.guilds.findFirst({
            where: () => eq(schema.guilds.id, id)
        });

        if (guild) {
            return new Guild(guild, this);
        }

        if (fetch) {
            return this.resolveGuild({ id, force: true, cache: true });
        }

        return undefined;
    }

    public async resolveRole({ id, guildId }: { id: string; guildId: string; }): Promise<Role | undefined> {
        const role = await this.store.select().from(schema.roles)
            .where(and(eq(schema.roles.id, id), eq(schema.roles.guildId, guildId)))
            .then(x => x[0]);

        if (role) {
            return new Role(role, this);
        }

        return undefined;
    }

    public async resolveVoiceState({ id, guildId }: { id: string; guildId: string; }): Promise<VoiceState | undefined> {
        const state = await this.store.query.voiceStates.findFirst({
            where: () => and(eq(schema.voiceStates.memberId, id), eq(schema.voiceStates.guildId, guildId))
        });

        if (state) return new VoiceState(state, this);

        return undefined;
    }

    public async resolveChannel({ force = false, fetch = true, cache, id, guildId }: { force?: boolean | undefined; fetch?: boolean; cache?: boolean | undefined; id: string; guildId: string; }): Promise<BaseChannel | undefined> {
        if (force) {
            const result = await Result.fromAsync<APIChannel>(async () => this.rest.get(Routes.channel(id)) as unknown as Promise<APIChannel>);
            if (result.isOk()) {
                const channel = result.unwrap();
                if (cache) {
                    await this.store.insert(schema.channels).values({
                        id: channel.id,
                        guildId: "guild_id" in channel ? channel.guild_id : null,
                        name: channel.name,
                        type: channel.type,
                        position: "position" in channel ? channel.position : null,
                        topic: "topic" in channel ? channel.topic : null,
                        nsfw: "nsfw" in channel ? channel.nsfw : null,
                        lastMessageId: "last_message_id" in channel ? channel.last_message_id : undefined
                    }).onConflictDoUpdate({
                        target: schema.channels.id,
                        set: {
                            name: sql`EXCLUDED.name`,
                            type: sql`EXCLUDED.type`,
                            position: sql`EXCLUDED.position`,
                            topic: sql`EXCLUDED.topic`,
                            nsfw: sql`EXCLUDED.nsfw`,
                            lastMessageId: sql`EXCLUDED.last_message_id`
                        }
                    });

                    if ("permission_overwrites" in channel && channel.permission_overwrites !== undefined) {
                        await this.store.delete(schema.channelsOverwrite).where(
                            and(
                                eq(schema.channelsOverwrite.channelId, channel.id),
                                notInArray(schema.channelsOverwrite.userOrRole, channel.permission_overwrites.map(x => x.id))
                            )
                        );

                        if (channel.permission_overwrites.length > 0) {
                            for (const overwrite of channel.permission_overwrites) {
                                // @ts-expect-error Intended to avoid .map
                                overwrite.channelId = channel.id;

                                // @ts-expect-error Intended to avoid .map
                                overwrite.userOrRole = overwrite.id;
                            }
                            await this.store.insert(schema.channelsOverwrite).values(channel.permission_overwrites)
                                .onConflictDoUpdate({
                                    target: [schema.channelsOverwrite.userOrRole, schema.channelsOverwrite.channelId],
                                    set: {
                                        type: sql`EXCLUDED.type`,
                                        allow: sql`EXCLUDED.allow`,
                                        deny: sql`EXCLUDED.deny`
                                    }
                                });
                        }
                    }
                }

                switch (channel.type) {
                    case ChannelType.GuildStageVoice:
                    case ChannelType.GuildVoice:
                        return new VoiceChannel({
                            id,
                            guildId: channel.guild_id,
                            name: channel.name,
                            type: channel.type as unknown as number,
                            position: "position" in channel ? channel.position : null,
                            nsfw: "nsfw" in channel ? channel.nsfw ?? false : null,
                            flags: channel.flags as unknown as number ?? null,
                            bitrate: channel.bitrate ?? null
                        }, this);
                    default: {
                        return new TextChannel({
                            id,
                            guildId: "guild_id" in channel ? channel.guild_id ?? null : null,
                            name: channel.name,
                            type: channel.type,
                            position: "position" in channel ? channel.position : null,
                            nsfw: "nsfw" in channel ? channel.nsfw ?? false : null,
                            flags: channel.flags ?? null
                        }, this);
                    }
                }
            }
        }

        const channel = await this.store.query.channels.findFirst({
            where: () => and(eq(schema.channels.id, id), eq(schema.channels.guildId, guildId))
        });

        if (channel) {
            switch (channel.type) {
                case ChannelType.GuildStageVoice:
                case ChannelType.GuildVoice:
                    return new VoiceChannel(channel, this);
                default: {
                    return new TextChannel(channel, this);
                }
            }
        }

        if (fetch) {
            return this.resolveChannel({ id, guildId, force: true, cache: true });
        }

        return undefined;
    }

    public async sendMessage(options: RESTPostAPIChannelMessageJSONBody, channelId: string): Promise<Message> {
        return this.rest.post(Routes.channelMessages(channelId), {
            body: options
        }).then(x => new Message(x as APIMessage, this));
    }

    public async bindQueue(channel: Channel, exchange: string, route: RoutedQueue): Promise<void> {
        if (Array.isArray(this.options.shardIds)) {
            for (const shard of this.options.shardIds) {
                await channel.bindQueue(route.queue, exchange, route.shard(shard).key);
            }
        } else if (this.options.shardIds && this.options.shardIds.start >= 0 && this.options.shardIds.end >= 1) {
            for (let i = this.options.shardIds.start; i < this.options.shardIds.end; i++) {
                await channel.bindQueue(route.queue, exchange, route.shard(i).key);
            }
        } else {
            for (let i = 0; i < this.options.shardCount; i++) {
                await channel.bindQueue(route.queue, exchange, route.shard(i).key);
            }
        }
    }

    public async publishExchange<T>(guildId: string, exchange: string, data: unknown, waitReply?: () => Promise<unknown>): Promise<Result<T, unknown>> {
        const currentShardId = Number(BigInt(guildId) >> 22n) % this.options.shardCount;

        const route = new RoutedQueue(GatewayExchangeRoutes.SEND, this.clientId, this.options.instanceName);
        const success = await this.amqp.publish(exchange, route.shard(currentShardId).key, Buffer.from(JSON.stringify(data)));

        if (waitReply) {
            return Result.fromAsync<T>(() => waitReply() as T);
        }

        return success ? Result.ok<T>({ success } as T) : Result.err(new Error("Failed to publish message"));
    }
}
