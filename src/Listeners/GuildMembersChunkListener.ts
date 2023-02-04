/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildMembersChunkDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildMembersChunk,
    emitter: container.gateway
}))

export class GuildMemberAddListener extends Listener {
    public async run(payload: { data: GatewayGuildMembersChunkDispatch }): Promise<void> {
        for (const member of payload.data.d.members) {
            if (Util.optionalEnv<boolean>("STATE_USER", "true")) await this.container.gateway.cache.users.set(member.user!.id, member.user);
            if (Util.optionalEnv<boolean>("STATE_MEMBER", "true")) await this.container.gateway.cache.members.set(`${payload.data.d.guild_id}:${member.user!.id}`, { ...member, user: Util.optionalEnv<boolean>("STATE_USER", "true") ? { } : member.user });
        }

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload }, { persistent: false });
    }
}
