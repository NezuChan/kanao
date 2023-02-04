/* eslint-disable class-methods-use-this */
import { GatewayChannelCreateDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.ChannelCreate,
    emitter: container.gateway
}))

export class ChannelCreateListener extends Listener {
    public async run(payload: { data: GatewayChannelCreateDispatch }): Promise<void> {
        if (Util.optionalEnv("STATE_CHANNEL", "true")) {
            if ("guild_id" in payload.data.d && payload.data.d.guild_id) {
                await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}`, `${payload.data.d.guild_id}:${payload.data.d.id}`);
                await this.container.gateway.cache.channels.set(`${payload.data.d.guild_id}:${payload.data.d.id}`, payload.data.d);
            } else {
                await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}`, payload.data.d.id);
                await this.container.gateway.cache.channels.set(payload.data.d.id, payload.data.d);
            }
        }
        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload }, { persistent: false });
    }
}
