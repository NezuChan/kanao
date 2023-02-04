/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildUpdate,
    emitter: container.gateway
}))

export class GuildUpdateListener extends Listener {
    public async run(payload: { data: GatewayGuildUpdateDispatch }): Promise<void> {
        const old = await this.container.gateway.cache.guilds.get(payload.data.d.id);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
            ...payload,
            old
        }, { persistent: false });

        await this.container.gateway.cache.guilds.set(payload.data.d.id, payload.data.d);
    }
}
