import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayGuildEmojisUpdateDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { stateEmojis } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { redisSScanStreamPromise } from "@nezuchan/utilities";
import { GenKey } from "../../Utilities/GenKey.js";

export class GuildEmojisUpdate extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildEmojisUpdate,
            enabled: stateEmojis
        });
    }

    public async run(payload: { data: GatewayGuildEmojisUpdateDispatch }): Promise<void> {
        const old_emojis = await redisSScanStreamPromise(this.store.redis, GenKey(`${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.guild_id), "*", 1000);
        for (const emoji of old_emojis) {
            await this.store.redis.unlink(emoji);
            await this.store.redis.srem(GenKey(`${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.guild_id), emoji);
        }

        for (const emoji of payload.data.d.emojis) {
            if (emoji.id) {
                await this.store.redis.set(GenKey(RedisKey.EMOJI_KEY, emoji.id, payload.data.d.guild_id), JSON.stringify(emoji));
                await this.store.redis.sadd(GenKey(`${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.guild_id), GenKey(RedisKey.EMOJI_KEY, emoji.id, payload.data.d.guild_id));
            }
        }
    }
}
