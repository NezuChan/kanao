/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildRoleDeleteDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { RedisKey } from "@nezuchan/constants";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildRoleDelete,
    emitter: container.gateway
}))

export class GuildRoleDeleteListener extends Listener {
    public async run(payload: { data: GatewayGuildRoleDeleteDispatch }): Promise<void> {
        await this.container.gateway.redis.srem(this.container.gateway.genKey(RedisKey.ROLE_KEY, true), `${payload.data.d.guild_id}:${payload.data.d.role_id}`);
        await this.container.gateway.cache.roles.delete(`${payload.data.d.guild_id}:${payload.data.d.role_id}`);
        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload }, { persistent: false });
    }
}
