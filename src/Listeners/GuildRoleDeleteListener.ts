/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildRoleDeleteDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildRoleDelete,
    emitter: container.gateway
}))

export class GuildRoleDeleteListener extends Listener {
    public async run(payload: { data: GatewayGuildRoleDeleteDispatch }): Promise<void> {
        await this.container.gateway.redis.srem(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.ROLE_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.ROLE_KEY}${Constants.KEYS_SUFFIX}`, `${payload.data.d.guild_id}:${payload.data.d.role_id}`);
        await this.container.gateway.cache.roles.delete(`${payload.data.d.guild_id}:${payload.data.d.role_id}`);
        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload }, { persistent: false });
    }
}
