import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayMessageDeleteDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateMessages } from "../../../config.js";

export class MessageUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageDelete
        });
    }

    public async run(payload: { data: GatewayMessageDeleteDispatch; shardId: number; }): Promise<void> {
        const message = await this.store.redis.get(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));

        if (stateMessages) {
            await this.store.redis.unlink(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: message === null ? null : JSON.parse(message)
        })));
    }
}
