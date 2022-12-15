/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayGuildMemberAddDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildMemberAdd,
    emitter: container.gateway
}))

export class GuildMemberAddListener extends Listener {
    public async run(payload: { data: GatewayGuildMemberAddDispatch }): Promise<void> {
        const memberCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MEMBER_KEY });
        const userCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.USER_KEY });

        if (Util.optionalEnv<boolean>("STATE_USER", "true")) await userCollection.set(payload.data.d.user!.id, payload.data.d.user);
        if (Util.optionalEnv("STATE_MEMBER", "true")) await memberCollection.set(payload.data.d.user!.id, { ...payload.data.d, user: Util.optionalEnv<boolean>("STATE_USER", "true") ? { } : payload.data.d.user });
    }
}
