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
        const channelCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.CHANNEL_KEY });

        if ("guild_id" in payload.data.d && payload.data.d.guild_id) await channelCollection.delete(`${payload.data.d.guild_id}:${payload.data.d.id}`);
        else await channelCollection.delete(payload.data.d.id);
    }
}
