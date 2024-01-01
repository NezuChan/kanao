import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayVoiceStateUpdateDispatch } from "discord-api-types/v10";
import { clientId, stateVoices } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class VoiceStateUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.VoiceStateUpdate
        });
    }

    public async run(payload: { data: GatewayVoiceStateUpdateDispatch; shardId: number }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id));

        if (stateVoices) {
            if (payload.data.d.channel_id) {
                await this.store.redis.set(GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
                await this.store.redis.sadd(GenKey(RedisKey.VOICE_KEY, RedisKey.LIST, payload.data.d.guild_id));
            } else {
                await this.store.redis.unlink(GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id));
                await this.store.redis.srem(GenKey(RedisKey.VOICE_KEY, RedisKey.LIST, payload.data.d.guild_id));
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: old ? JSON.parse(old) : null
        })));
    }
}
