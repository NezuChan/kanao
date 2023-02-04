/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayMessageDeleteBulkDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.MessageDeleteBulk,
    emitter: container.gateway
}))

export class MessageDeleteBulkListener extends Listener {
    public async run(payload: { data: GatewayMessageDeleteBulkDispatch }): Promise<void> {
        if (Util.optionalEnv("STATE_MESSAGE", "true")) {
            const messages = [];

            const keys = await this.container.gateway.redis.smembers(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MESSAGE_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.MESSAGE_KEY}${Constants.KEYS_SUFFIX}`);
            for (const key of keys) {
                const message = await this.container.gateway.cache.messages.get(key);
                if (message && payload.data.d.ids.includes(message.id)) {
                    await this.container.gateway.redis.srem(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MESSAGE_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.MESSAGE_KEY}${Constants.KEYS_SUFFIX}`, message.id);
                    await this.container.gateway.cache.messages.delete(message.id);
                    messages.push(message);
                }
            }

            this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
                ...payload,
                old: messages
            }, { persistent: false });
        }
    }
}
