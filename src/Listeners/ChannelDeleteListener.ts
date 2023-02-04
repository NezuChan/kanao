/* eslint-disable class-methods-use-this */
import { GatewayChannelDeleteDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.ChannelDelete,
    emitter: container.gateway
}))

export class ChannelDeleteListener extends Listener {
    public async run(payload: { data: GatewayChannelDeleteDispatch }): Promise<void> {
        const old = await this.container.gateway.cache.channels.get(payload.data.d.id);

        if ("guild_id" in payload.data.d && payload.data.d.guild_id) {
            await this.container.gateway.redis.srem(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}`, `${payload.data.d.guild_id}:${payload.data.d.id}`);
            await this.container.gateway.cache.channels.delete(`${payload.data.d.guild_id}:${payload.data.d.id}`);
        } else {
            await this.container.gateway.redis.srem(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}`, payload.data.d.id);
            await this.container.gateway.cache.channels.delete(payload.data.d.id);
        }

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload, old }, { persistent: false });
    }
}
