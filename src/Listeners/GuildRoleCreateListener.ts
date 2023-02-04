/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildRoleCreateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildRoleCreate,
    emitter: container.gateway
}))

export class GuildRoleCreateListener extends Listener {
    public async run(payload: { data: GatewayGuildRoleCreateDispatch }): Promise<void> {
        if (Util.optionalEnv("STATE_ROLE", "true")) {
            await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.ROLE_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.ROLE_KEY}${Constants.KEYS_SUFFIX}`, `${payload.data.d.guild_id}:${payload.data.d.role.id}`);
            await this.container.gateway.cache.roles.set(`${payload.data.d.guild_id}:${payload.data.d.role.id}`, payload.data.d.role);
        }
        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload }, { persistent: false });
    }
}
