/* eslint-disable class-methods-use-this */
import { GatewayChannelUpdateDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.ChannelUpdate,
    emitter: container.gateway
}))

export class ChannelUpdateListener extends Listener {
    public async run(payload: { data: GatewayChannelUpdateDispatch }): Promise<void> {
        const old = await this.container.gateway.cache.channels.get(payload.data.d.id);

        if ("guild_id" in payload.data.d && payload.data.d.guild_id) await this.container.gateway.cache.channels.set(`${payload.data.d.guild_id}:${payload.data.d.id}`, payload.data.d);
        else await this.container.gateway.cache.channels.set(payload.data.d.id, payload.data.d);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload, old }, { persistent: false });
    }
}
