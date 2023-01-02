/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayMessageDeleteBulkDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.MessageDeleteBulk,
    emitter: container.gateway
}))

export class MessageDeleteBulkListener extends Listener {
    public async run(payload: { data: GatewayMessageDeleteBulkDispatch }): Promise<void> {
        const messageCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MESSAGE_KEY}` : Constants.MESSAGE_KEY });

        if (Util.optionalEnv("STATE_MESSAGE", "true")) {
            const messages = await messageCollection.filter((_, key) => payload.data.d.ids.includes(key));

            this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
                ...payload,
                old: messages
            }, { persistent: false });

            for (const [key] of messages) await messageCollection.delete(key);
        }
    }
}
