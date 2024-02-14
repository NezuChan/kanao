/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable stylistic/max-len */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Buffer } from "node:buffer";
import EventEmitter from "node:events";
import process from "node:process";
import { URLSearchParams } from "node:url";
import { REST } from "@discordjs/rest";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import * as schema from "@nezuchan/kanao-schema";
import { GenKey, RoutingKey, createAmqpChannel } from "@nezuchan/utilities";
import { Result } from "@sapphire/result";
import type { ChannelWrapper } from "amqp-connection-manager";
import type { Channel } from "amqplib";
import type { APIChannel, APIGuild, APIGuildMember, APIMessage, APIUser, GatewayVoiceState, RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { ChannelType, Routes } from "discord-api-types/v10";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
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
    public drizzle: PostgresJsDatabase<typeof schema>;
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

        this.drizzle = drizzle(postgres(options.databaseUrl), { schema });

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
        await channel.assertExchange(RabbitMQ.GATEWAY_QUEUE_SEND, "direct", { durable: false });
        const { queue } = await channel.assertQueue("", { exclusive: true });

        await this.bindQueue(channel, queue, RabbitMQ.GATEWAY_QUEUE_SEND);

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
                    await this.drizzle.insert(schema.members).values({
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

        const member = await this.drizzle.query.members.findFirst({
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
            const user = await Result.fromAsync(async () => this.rest.get(Routes.user(id)));
            if (user.isOk()) {
                const user_value = user.unwrap() as APIUser;
                if (cache) await this.redis.set(GenKey(this.clientId, RedisKey.USER_KEY, id), JSON.stringify(user_value));
                return new User({ ...user_value, id }, this);
            }
        }

        const cached_user = await this.redis.get(GenKey(this.clientId, RedisKey.USER_KEY, id));
        if (cached_user) {
            return new User({ ...JSON.parse(cached_user), id }, this);
        }

        if (fetch) {
            return this.resolveUser({ id, force: true, cache: true });
        }

        return undefined;
    }

    public async resolveGuild({ force = false, fetch = true, withCounts = false, cache, id }: { force?: boolean | undefined; fetch?: boolean; cache?: boolean | undefined; id: string; withCounts?: boolean; }): Promise<Guild | undefined> {
        if (force) {
            const guild = await Result.fromAsync(
                async () => this.rest.get(
                    Routes.guild(id),
                    withCounts ? { query: new URLSearchParams({ with_counts: "true" }) } : {}
                )
            );
            if (guild.isOk()) {
                const guild_value = guild.unwrap() as APIGuild;
                if (cache) await this.redis.set(GenKey(this.clientId, RedisKey.GUILD_KEY, id), JSON.stringify(guild_value));
                return new Guild({ ...guild_value, id }, this);
            }
        }

        const cached_guild = await this.redis.get(GenKey(this.clientId, RedisKey.GUILD_KEY, id));
        if (cached_guild) {
            return new Guild({ ...JSON.parse(cached_guild), id }, this);
        }

        if (fetch) {
            return this.resolveGuild({ id, force: true, cache: true });
        }

        return undefined;
    }

    public async resolveRole({ id, guildId }: { id: string; guildId: string; }): Promise<Role | undefined> {
        const cached_role = await this.redis.get(GenKey(this.clientId, RedisKey.ROLE_KEY, id, guildId));
        if (cached_role) {
            return new Role({ ...JSON.parse(cached_role), id, guild_id: guildId }, this);
        }

        return undefined;
    }

    public async resolveVoiceState({ id, guildId }: { id: string; guildId: string; }): Promise<VoiceState | undefined> {
        const state = await this.redis.get(GenKey(this.clientId, RedisKey.VOICE_KEY, id, guildId));
        if (state) {
            return new VoiceState({ ...JSON.parse(state) as GatewayVoiceState, id }, this);
        }

        return undefined;
    }

    public async resolveChannel({ force = false, fetch = true, cache, id, guildId }: { force?: boolean | undefined; fetch?: boolean; cache?: boolean | undefined; id: string; guildId: string; }): Promise<BaseChannel | undefined> {
        if (force) {
            const channel = await Result.fromAsync(async () => this.rest.get(Routes.channel(id)));
            if (channel.isOk()) {
                const channel_value = channel.unwrap() as APIChannel;
                if (cache) await this.redis.set(GenKey(this.clientId, RedisKey.CHANNEL_KEY, id, guildId), JSON.stringify(channel_value));
                switch (channel_value.type) {
                    case ChannelType.GuildStageVoice:
                    case ChannelType.GuildVoice:
                        return new VoiceChannel({ ...channel_value, id, guild_id: guildId }, this);
                    default: {
                        return new TextChannel({ ...channel_value, id, guild_id: guildId }, this);
                    }
                }
            }
        }

        const cached_user = await this.redis.get(GenKey(this.clientId, RedisKey.CHANNEL_KEY, id, guildId));
        if (cached_user) {
            const channel_value = JSON.parse(cached_user) as APIChannel;
            switch (channel_value.type) {
                case ChannelType.GuildStageVoice:
                case ChannelType.GuildVoice:
                    return new VoiceChannel({ ...channel_value, id, guild_id: guildId }, this);
                default: {
                    return new TextChannel({ ...channel_value, id, guild_id: guildId }, this);
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

    public async bindQueue(channel: Channel, queue: string, exchange: string): Promise<void> {
        if (Array.isArray(this.options.shardIds)) {
            for (const shard of this.options.shardIds) {
                await channel.bindQueue(queue, exchange, RoutingKey(this.clientId, shard));
            }
        } else if (this.options.shardIds && this.options.shardIds.start >= 0 && this.options.shardIds.end >= 1) {
            for (let i = this.options.shardIds.start; i < this.options.shardIds.end; i++) {
                await channel.bindQueue(queue, exchange, RoutingKey(this.clientId, i));
            }
        } else {
            const shardCount = await this.redis.get(GenKey(this.clientId, RedisKey.SHARDS_KEY));
            if (shardCount) {
                for (let i = 0; i < Number(shardCount); i++) {
                    await channel.bindQueue(queue, exchange, RoutingKey(this.clientId, i));
                }
            }
        }
    }

    public async fetchShardCount(): Promise<number> {
        const shardCount = await this.redis.get(GenKey(this.clientId, RedisKey.SHARDS_KEY));
        return shardCount ? Number(shardCount) : 1;
    }

    public async publishExchange<T>(guildId: string, exchange: string, data: unknown, waitReply?: () => Promise<unknown>): Promise<Result<T, unknown>> {
        const shardCount = await this.fetchShardCount();
        const currentShardId = Number(BigInt(guildId) >> 22n) % shardCount;

        const success = await this.amqp.publish(exchange, RoutingKey(this.clientId, currentShardId), Buffer.from(JSON.stringify(data)));

        if (waitReply) {
            return Result.fromAsync<T>(() => waitReply() as T);
        }

        return success ? Result.ok<T>({ success } as T) : Result.err(new Error("Failed to publish message"));
    }
}
