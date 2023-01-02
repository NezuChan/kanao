/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayGuildMemberRemoveDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildMemberRemove,
    emitter: container.gateway
}))

export class GuildMemberRemoveListener extends Listener {
    public async run(payload: { data: GatewayGuildMemberRemoveDispatch }): Promise<void> {
        const memberCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MEMBER_KEY}` : Constants.MEMBER_KEY });
        const userCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.USER_KEY}` : Constants.USER_KEY });
        const presenceCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.PRESENCE_KEY}` : Constants.PRESENCE_KEY });

        const old = await memberCollection.get(payload.data.d.user.id);

        this.container.gateway.amqp.sender.publish(process.env.USE_ROUTING === "true" ? this.container.gateway.clientId : payload.data.t, {
            ...payload,
            old
        }, { persistent: false });

        if (Util.optionalEnv<boolean>("STATE_USER", "true")) await userCollection.delete(payload.data.d.user.id);
        if (Util.optionalEnv<boolean>("STATE_PRESENCE", "true")) await presenceCollection.delete(`${payload.data.d.guild_id}:${payload.data.d.user.id}`);
        if (Util.optionalEnv("STATE_MEMBER", "true")) await memberCollection.delete(payload.data.d.user.id);
    }
}
