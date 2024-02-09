import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayVoiceStateUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateVoices } from "../../../config.js";

export class VoiceStateUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.VoiceStateUpdate
        });
    }

    public async run(payload: { data: GatewayVoiceStateUpdateDispatch; shardId: number; }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id));

        if (stateVoices) {
            if (payload.data.d.channel_id === null) {
                const key = GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id);
                await this.store.redis.unlink(key);
                await this.store.redis.srem(GenKey(RedisKey.VOICE_KEY, RedisKey.LIST, payload.data.d.guild_id), key);
            } else {
                const key = GenKey(RedisKey.VOICE_KEY, payload.data.d.user_id, payload.data.d.guild_id);
                await this.store.redis.set(key, JSON.stringify({
                    ...payload.data.d,
                    member: payload.data.d.member
                        ? {
                            ...payload.data.d.member,
                            roles: []
                        }
                        : null
                }));
                await this.store.redis.sadd(GenKey(RedisKey.VOICE_KEY, RedisKey.LIST, payload.data.d.guild_id), key);
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: old === null ? null : JSON.parse(old)
        })));
    }
}
