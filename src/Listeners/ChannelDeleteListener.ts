/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayChannelDeleteDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.ChannelDelete,
    emitter: container.gateway
}))

export class ChannelDeleteListener extends Listener {
    public async run(payload: { data: GatewayChannelDeleteDispatch }): Promise<void> {
        const channelCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.CHANNEL_KEY}` : Constants.CHANNEL_KEY });

        const old = await channelCollection.get(payload.data.d.id);

        if ("guild_id" in payload.data.d && payload.data.d.guild_id) await channelCollection.delete(`${payload.data.d.guild_id}:${payload.data.d.id}`);
        else await channelCollection.delete(payload.data.d.id);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload, old }, { persistent: false });
    }
}
