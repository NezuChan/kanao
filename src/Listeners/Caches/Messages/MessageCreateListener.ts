import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayMessageCreateDispatch } from "discord-api-types/v10";
import { stateMembers, stateMessages, stateUsers } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "../../../Utilities/RoutingKey.js";

export class MessageCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageCreate
        });
    }

    public async run(payload: { data: GatewayMessageCreateDispatch; shardId: number }): Promise<void> {
        if (stateMembers) {
            await this.store.redis.set(GenKey(RedisKey.MEMBER_KEY, payload.data.d.author.id, payload.data.d.guild_id), JSON.stringify(payload.data.d.author));
            await this.store.redis.sadd(GenKey(`${RedisKey.MEMBER_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.guild_id), GenKey(RedisKey.MEMBER_KEY, payload.data.d.author.id, payload.data.d.guild_id));
        }

        if (stateUsers) {
            await this.store.redis.set(GenKey(RedisKey.USER_KEY, payload.data.d.author.id), JSON.stringify(payload.data.d.author));
            await this.store.redis.sadd(GenKey(`${RedisKey.USER_KEY}${RedisKey.KEYS_SUFFIX}`), GenKey(RedisKey.USER_KEY, payload.data.d.author.id));
        }

        if (stateMessages) {
            await this.store.redis.set(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
            await this.store.redis.sadd(GenKey(`${RedisKey.MESSAGE_KEY}${RedisKey.KEYS_SUFFIX}`, undefined, payload.data.d.guild_id), GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));
        }

        this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
