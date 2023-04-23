import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayMessageDeleteBulkDispatch } from "discord-api-types/v10";
import { clientId, stateMessages } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class MessageDeleteBulkListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageDeleteBulk,
            enabled: stateMessages
        });
    }

    public async run(payload: { data: GatewayMessageDeleteBulkDispatch; shardId: number }): Promise<void> {
        const messages = [];

        for (const id of payload.data.d.ids) {
            if (stateMessages) {
                const message = await this.store.redis.get(GenKey(RedisKey.MESSAGE_KEY, id, payload.data.d.guild_id));
                if (message) {
                    messages.push(JSON.parse(message));
                }

                await this.store.redis.unlink(GenKey(RedisKey.MESSAGE_KEY, id, payload.data.d.guild_id));
                await this.store.redis.srem(GenKey(`${RedisKey.MESSAGE_KEY}${RedisKey.KEYS_SUFFIX}`, id, payload.data.d.guild_id), GenKey(RedisKey.MESSAGE_KEY, id, payload.data.d.guild_id));
            }
        }

        this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: messages
        })));
    }
}
