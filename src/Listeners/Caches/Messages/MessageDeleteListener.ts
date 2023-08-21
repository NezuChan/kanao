import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayMessageDeleteDispatch } from "discord-api-types/v10";
import { clientId, stateMessages } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class MessageUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageDelete
        });
    }

    public async run(payload: { data: GatewayMessageDeleteDispatch; shardId: number }): Promise<void> {
        const message = await this.store.redis.get(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));
        
        if (stateMessages) {
            await this.store.redis.unlink(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));
            await this.store.redis.srem(GenKey(`${RedisKey.MESSAGE_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.guild_id), GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: message ? JSON.parse(message) : null
        })));
    }
}
