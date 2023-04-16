import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayGuildEmojisUpdateDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { clientId, stateEmojis } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";

export class GuildEmojisUpdate extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildEmojisUpdate,
            enabled: stateEmojis
        });
    }

    public async run(payload: { data: GatewayGuildEmojisUpdateDispatch }): Promise<void> {
        const old_emojis = await this.store.redis.smembers(`${clientId}:${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.guild_id}`);
        for (const emoji of old_emojis) {
            await this.store.redis.unlink(emoji);
            await this.store.redis.srem(`${clientId}:${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.guild_id}`, emoji);
        }

        for (const emoji of payload.data.d.emojis) {
            await this.store.redis.set(`${clientId}:${RedisKey.EMOJI_KEY}:${payload.data.d.guild_id}:${emoji.id}`, JSON.stringify(emoji));
            await this.store.redis.sadd(`${clientId}:${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.guild_id}`, `${clientId}:${RedisKey.EMOJI_KEY}:${payload.data.d.guild_id}:${emoji.id}`);
        }
    }
}
