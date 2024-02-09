/* eslint-disable stylistic/max-len */
import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayVoiceServerUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateVoices } from "../../../config.js";

export class VoiceStateUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.VoiceServerUpdate
        });
    }

    public async run(payload: { data: GatewayVoiceServerUpdateDispatch; shardId: number; }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.VOICE_SERVER_KEY, payload.data.d.guild_id));

        if (stateVoices) {
            await (payload.data.d.endpoint === null ? this.store.redis.unlink(GenKey(RedisKey.VOICE_SERVER_KEY, payload.data.d.guild_id)) : this.store.redis.set(GenKey(RedisKey.VOICE_SERVER_KEY, payload.data.d.guild_id), JSON.stringify(payload.data.d)));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: old === null ? null : JSON.parse(old)
        })));
    }
}
