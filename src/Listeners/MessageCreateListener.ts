/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayMessageCreateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.MessageCreate,
    emitter: container.gateway
}))

export class MessageCreateListener extends Listener {
    public async run(payload: { data: GatewayMessageCreateDispatch }): Promise<void> {
        if (Util.optionalEnv("STATE_MEMBER", "true")) await this.container.gateway.cache.members.set(`${payload.data.d.guild_id!}:${payload.data.d.author.id}`, { ...payload.data.d.member, user: Util.optionalEnv<boolean>("STATE_USER", "true") ? { } : payload.data.d.author });
        if (Util.optionalEnv("STATE_USER", "true")) await this.container.gateway.cache.users.set(payload.data.d.author.id, payload.data.d.author);
        if (Util.optionalEnv("STATE_MESSAGE", "true")) await this.container.gateway.cache.members.set(payload.data.d.id, payload.data.d);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload }, { persistent: false });
    }
}
