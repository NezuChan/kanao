import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayVoiceStateUpdateDispatch } from "discord-api-types/v10";
import { stateMessages } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../Utilities/GenKey.js";

export class VoiceStateUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.VoiceStateUpdate,
            enabled: stateMessages
        });
    }

    public async run(payload: { data: GatewayVoiceStateUpdateDispatch }): Promise<void> {
        if (payload.data.d.channel_id) {
            await this.store.redis.set(GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
            await this.store.redis.sadd(GenKey(`${RedisKey.VOICE_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.user_id, payload.data.d.guild_id), GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id));
        } else {
            await this.store.redis.unlink(GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id));
            await this.store.redis.srem(GenKey(`${RedisKey.VOICE_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.user_id, payload.data.d.guild_id), GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id));
        }
    }
}
