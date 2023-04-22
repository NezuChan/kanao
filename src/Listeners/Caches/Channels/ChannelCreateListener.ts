import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayChannelCreateDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { stateChannels } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "../../../Utilities/RoutingKey.js";

export class ChannelCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelCreate,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelCreateDispatch; shardId: number }): Promise<void> {
        if ("guild_id" in payload.data.d && payload.data.d.guild_id) {
            await this.store.redis.set(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
            await this.store.redis.sadd(GenKey(`${RedisKey.CHANNEL_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.id, payload.data.d.guild_id), GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id, payload.data.d.guild_id));
        } else {
            await this.store.redis.set(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id), JSON.stringify(payload.data.d));
            await this.store.redis.sadd(GenKey(`${RedisKey.CHANNEL_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.id), GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id));
        }

        this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
