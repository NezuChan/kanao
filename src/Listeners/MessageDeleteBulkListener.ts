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
    public async run(payload: GatewayMessageDeleteBulkDispatch): Promise<void> {
        const messageCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MESSAGE_KEY });

        if (Util.optionalEnv("STATE_MESSAGE", "true")) {
            const messages = await messageCollection.filter((_, key) => payload.d.ids.includes(key));
            for (const [key] of messages) await messageCollection.delete(key);
        }
    }
}
