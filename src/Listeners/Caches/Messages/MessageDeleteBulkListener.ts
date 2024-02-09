/* eslint-disable no-await-in-loop */
import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayMessageDeleteBulkDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateMessages } from "../../../config.js";

export class MessageDeleteBulkListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageDeleteBulk
        });
    }

    public async run(payload: { data: GatewayMessageDeleteBulkDispatch; shardId: number; }): Promise<void> {
        const messages = [];

        if (stateMessages) {
            for (const id of payload.data.d.ids) {
                const message = await this.store.redis.get(GenKey(RedisKey.MESSAGE_KEY, id, payload.data.d.guild_id));
                if (message !== null) messages.push(JSON.parse(message));

                await this.store.redis.unlink(GenKey(RedisKey.MESSAGE_KEY, id, payload.data.d.guild_id));
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: messages
        })));
    }
}
