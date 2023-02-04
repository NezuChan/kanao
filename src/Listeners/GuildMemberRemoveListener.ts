/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildMemberRemoveDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildMemberRemove,
    emitter: container.gateway
}))

export class GuildMemberRemoveListener extends Listener {
    public async run(payload: { data: GatewayGuildMemberRemoveDispatch }): Promise<void> {
        const old = await this.container.gateway.cache.members.get(payload.data.d.user.id);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
            ...payload,
            old
        }, { persistent: false });

        if (Util.optionalEnv<boolean>("STATE_USER", "true")) await this.container.gateway.cache.users.delete(payload.data.d.user.id);
        if (Util.optionalEnv<boolean>("STATE_PRESENCE", "true")) await this.container.gateway.cache.presences.delete(`${payload.data.d.guild_id}:${payload.data.d.user.id}`);
        if (Util.optionalEnv("STATE_MEMBER", "true")) await this.container.gateway.cache.members.delete(payload.data.d.user.id);
    }
}
