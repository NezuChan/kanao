/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayMessageDeleteBulkDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.MessageDeleteBulk,
    emitter: container.gateway
}))

export class MessageDeleteBulkListener extends Listener {
    public async run(payload: { data: GatewayMessageDeleteBulkDispatch }): Promise<void> {
        if (Util.optionalEnv("STATE_MESSAGE", "true")) {
            const messages = await this.container.gateway.cache.messages.filter((_, key) => payload.data.d.ids.includes(key));

            this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
                ...payload,
                old: messages
            }, { persistent: false });

            for (const [key] of messages) await this.container.gateway.cache.messages.delete(key);
        }
    }
}
