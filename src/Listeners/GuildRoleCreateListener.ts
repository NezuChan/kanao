/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayGuildRoleCreateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildRoleCreate,
    emitter: container.gateway
}))

export class GuildRoleCreateListener extends Listener {
    public async run(payload: { data: GatewayGuildRoleCreateDispatch }): Promise<void> {
        const roleCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.ROLE_KEY}` : Constants.ROLE_KEY });

        if (Util.optionalEnv("STATE_ROLE", "true")) await roleCollection.set(payload.data.d.role.id, payload.data.d.role);
        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload }, { persistent: false });
    }
}
