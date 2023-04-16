import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildDeleteDispatch } from "discord-api-types/v10";
import { clientId } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { redisSScanStreamPromise } from "@nezuchan/utilities";

export class GuildDeleteListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildDelete
        });
    }

    public async run(payload: { data: GatewayGuildDeleteDispatch }): Promise<void> {
        const roles = await this.store.redis.smembers(`${clientId}:${RedisKey.ROLE_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        const channels = await redisSScanStreamPromise(this.store.redis, `${clientId}:${RedisKey.CHANNEL_KEY}${RedisKey.KEYS_SUFFIX}`, "*", 1000);
        const members = await this.store.redis.smembers(`${clientId}:${RedisKey.MEMBER_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        const emojis = await this.store.redis.smembers(`${clientId}:${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        const presences = await this.store.redis.smembers(`${clientId}:${RedisKey.PRESENCE_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        const voiceStates = await this.store.redis.smembers(`${clientId}:${RedisKey.VOICE_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);

        for (const role of roles) {
            await this.store.redis.unlink(role);
        }

        for (const channel of channels) {
            await this.store.redis.unlink(channel);
        }

        for (const member of members) {
            await this.store.redis.unlink(member);
        }

        for (const emoji of emojis) {
            await this.store.redis.unlink(emoji);
        }

        for (const presence of presences) {
            await this.store.redis.unlink(presence);
        }

        for (const voiceState of voiceStates) {
            await this.store.redis.unlink(voiceState);
        }

        await this.store.redis.unlink(`${clientId}:${RedisKey.GUILD_KEY}:${payload.data.d.id}`);
        await this.store.redis.unlink(`${clientId}:${RedisKey.GUILD_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        await this.store.redis.unlink(`${clientId}:${RedisKey.ROLE_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        await this.store.redis.unlink(`${clientId}:${RedisKey.CHANNEL_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        await this.store.redis.unlink(`${clientId}:${RedisKey.MEMBER_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        await this.store.redis.unlink(`${clientId}:${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        await this.store.redis.unlink(`${clientId}:${RedisKey.PRESENCE_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
        await this.store.redis.unlink(`${clientId}:${RedisKey.VOICE_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.id}`);
    }
}
