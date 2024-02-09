import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayMessageCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateMembers, stateMessages, stateUsers } from "../../../config.js";

export class MessageCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageCreate
        });
    }

    public async run(payload: { data: GatewayMessageCreateDispatch; shardId: number; }): Promise<void> {
        if (stateMembers) {
            await this.store.redis.set(GenKey(RedisKey.MEMBER_KEY, payload.data.d.author.id, payload.data.d.guild_id), JSON.stringify(payload.data.d.member));
        }

        if (stateUsers) {
            const key = GenKey(RedisKey.USER_KEY, payload.data.d.author.id);
            const exists = await this.store.redis.exists(key);
            await this.store.redis.set(key, JSON.stringify(payload.data.d.author));
            if (exists === 0) await this.store.redis.incr(GenKey(RedisKey.USER_KEY, RedisKey.COUNT));
        }

        if (stateMessages) {
            await this.store.redis.set(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
