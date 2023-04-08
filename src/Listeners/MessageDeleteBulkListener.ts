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

            const keys = await Util.sscanStreamPromise(this.container.gateway.redis, this.container.gateway.genKey(Constants.MESSAGE_KEY, true), `${payload.data.d.channel_id}:*`, 1000);
            for (const key of keys) {
                const message = await this.container.gateway.cache.messages.get(key);
                if (message && payload.data.d.ids.includes(message.id)) {
                    await this.container.gateway.redis.srem(this.container.gateway.genKey(Constants.MESSAGE_KEY, true), message.id);
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
