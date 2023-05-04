import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayUserUpdateDispatch } from "discord-api-types/v10";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";
import { clientId } from "../../../config.js";

export class UserUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.UserUpdate
        });
    }

    public async run(payload: { data: GatewayUserUpdateDispatch; shardId: number }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.BOT_USER_KEY));
        await this.store.redis.set(GenKey(RedisKey.BOT_USER_KEY), JSON.stringify(payload.data.d));

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: old ? JSON.parse(old) : null
        })));
    }
}
