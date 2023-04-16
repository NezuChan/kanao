import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { clientId, stateChannels, stateEmojis, stateMembers, stateRoles, stateUsers, stateVoices } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildCreate
        });
    }

    public async run(payload: { data: GatewayGuildCreateDispatch }): Promise<void> {
        if (payload.data.d.unavailable) return;

        if (stateMembers || stateUsers) {
            for (const member of payload.data.d.members) {
                if (stateMembers) {
                    await this.store.redis.set(`${clientId}:${RedisKey.MEMBER_KEY}:${payload.data.d.id}:${member.user!.id}`, JSON.stringify(member));
                    await this.store.redis.sadd(`${clientId}:${RedisKey.MEMBER_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`, `${clientId}:${RedisKey.MEMBER_KEY}:${payload.data.d.id}:${member.user!.id}`);
                }

                if (stateUsers) {
                    await this.store.redis.set(`${clientId}:${RedisKey.USER_KEY}:${member.user!.id}`, JSON.stringify(member.user));
                    await this.store.redis.sadd(`${clientId}:${RedisKey.USER_KEY}${RedisKey.KEYS_SUFFIX}`, `${clientId}:${RedisKey.USER_KEY}:${member.user!.id}`);
                }
            }
            payload.data.d.members = [];
        }

        if (stateChannels) {
            for (const channel of payload.data.d.channels) {
                await this.store.redis.set(`${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.id}:${channel.id}`, JSON.stringify(channel));
                await this.store.redis.sadd(`${clientId}:${RedisKey.CHANNEL_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`, `${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.id}:${channel.id}`);
            }
            payload.data.d.channels = [];
        }

        if (stateRoles) {
            for (const role of payload.data.d.roles) {
                await this.store.redis.set(`${clientId}:${RedisKey.ROLE_KEY}:${payload.data.d.id}:${role.id}`, JSON.stringify(role));
                await this.store.redis.sadd(`${clientId}:${RedisKey.ROLE_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`, `${clientId}:${RedisKey.ROLE_KEY}:${payload.data.d.id}:${role.id}`);
            }
            payload.data.d.roles = [];
        }

        if (stateVoices) {
            for (const voice of payload.data.d.voice_states) {
                await this.store.redis.set(`${clientId}:${RedisKey.VOICE_KEY}:${payload.data.d.id}:${voice.user_id}`, JSON.stringify(voice));
                await this.store.redis.sadd(`${clientId}:${RedisKey.VOICE_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`, `${clientId}:${RedisKey.VOICE_KEY}:${payload.data.d.id}:${voice.user_id}`);
            }
            payload.data.d.voice_states = [];
        }

        if (stateEmojis) {
            for (const emoji of payload.data.d.emojis) {
                await this.store.redis.set(`${clientId}:${RedisKey.EMOJI_KEY}:${payload.data.d.id}:${emoji.id}`, JSON.stringify(emoji));
                await this.store.redis.sadd(`${clientId}:${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`, `${clientId}:${RedisKey.EMOJI_KEY}:${payload.data.d.id}:${emoji.id}`);
            }
            payload.data.d.emojis = [];
        }

        await this.store.redis.sadd(`${clientId}:${RedisKey.GUILD_KEY}${RedisKey.KEYS_SUFFIX}`, `${clientId}:${RedisKey.GUILD_KEY}:${payload.data.d.id}`);
        await this.store.redis.set(`${clientId}:${RedisKey.GUILD_KEY}:${payload.data.d.id}`, JSON.stringify(payload.data.d));
    }
}
