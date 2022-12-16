/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayMessageDeleteDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.MessageDelete,
    emitter: container.gateway
}))

export class MessageDeleteListener extends Listener {
    public async run(payload: { data: GatewayMessageDeleteDispatch }): Promise<void> {
        const messageCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MESSAGE_KEY });

        const old = await messageCollection.get(payload.data.d.id);

        this.container.gateway.amqp.sender.publish(payload.data.t, {
            ...payload,
            old
        }, { persistent: false });

        if (Util.optionalEnv("STATE_MESSAGE", "true")) await messageCollection.set(payload.data.d.id, payload.data.d);
    }
}
