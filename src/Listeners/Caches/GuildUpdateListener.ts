import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildUpdateDispatch } from "discord-api-types/v10";
import { stateEmojis, stateRoles } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../Utilities/GenKey.js";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildUpdate
        });
    }

    public async run(payload: { data: GatewayGuildUpdateDispatch }): Promise<void> {
        if (stateRoles) {
            for (const role of payload.data.d.roles) {
                await this.store.redis.set(GenKey(`${RedisKey.ROLE_KEY}`, role.id, payload.data.d.id), JSON.stringify(role));
                await this.store.redis.sadd(GenKey(`${RedisKey.ROLE_KEY}${RedisKey.KEYS_SUFFIX}`, role.id, payload.data.d.id), GenKey(`${RedisKey.ROLE_KEY}`, role.id, payload.data.d.id));
            }
            payload.data.d.roles = [];
        }

        if (stateEmojis) {
            for (const emoji of payload.data.d.emojis) {
                if (emoji.id) {
                    await this.store.redis.set(GenKey(`${RedisKey.EMOJI_KEY}`, emoji.id, payload.data.d.id), JSON.stringify(emoji));
                    await this.store.redis.sadd(GenKey(`${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}`, emoji.id, payload.data.d.id), GenKey(`${RedisKey.EMOJI_KEY}`, emoji.id, payload.data.d.id));
                }
            }
            payload.data.d.emojis = [];
        }

        await this.store.redis.sadd(GenKey(`${RedisKey.GUILD_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.id), GenKey(`${RedisKey.GUILD_KEY}`, payload.data.d.id));
        await this.store.redis.set(GenKey(`${RedisKey.GUILD_KEY}`, payload.data.d.id), JSON.stringify(payload.data.d));
    }
}
