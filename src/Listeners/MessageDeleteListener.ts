/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayMessageDeleteDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.MessageDelete,
    emitter: container.gateway
}))

export class MessageDeleteListener extends Listener {
    public async run(payload: { data: GatewayMessageDeleteDispatch }): Promise<void> {
        const old = await this.container.gateway.cache.messages.get(payload.data.d.id);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
            ...payload,
            old
        }, { persistent: false });

        if (Util.optionalEnv("STATE_MESSAGE", "true")) {
            await this.container.gateway.redis.srem(this.container.gateway.genKey(Constants.MESSAGE_KEY, true), payload.data.d.id);
            await this.container.gateway.cache.messages.delete(payload.data.d.id);
        }
    }
}
