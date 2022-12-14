/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayMessageCreateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.MessageCreate,
    emitter: container.gateway
}))

export class MessageCreateListener extends Listener {
    public async run(payload: GatewayMessageCreateDispatch): Promise<void> {
        const messageCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MESSAGE_KEY });
        const memberCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MEMBER_KEY });
        const userCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.USER_KEY });

        if (Util.optionalEnv("STATE_MEMBER", "true")) await memberCollection.set(payload.d.author.id, payload.d.member);
        if (Util.optionalEnv("STATE_USER", "true")) await userCollection.set(payload.d.author.id, payload.d.author);
        if (Util.optionalEnv("STATE_MESSAGE", "true")) await messageCollection.set(payload.d.id, payload.d);
    }
}
