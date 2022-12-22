/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayChannelCreateDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.ChannelCreate,
    emitter: container.gateway
}))

export class ChannelCreateListener extends Listener {
    public async run(payload: { data: GatewayChannelCreateDispatch }): Promise<void> {
        const channelCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.CHANNEL_KEY });

        if (Util.optionalEnv("STATE_CHANNEL", "true")) {
            if ("guild_id" in payload.data.d && payload.data.d.guild_id) await channelCollection.set(`${payload.data.d.guild_id}:${payload.data.d.id}`, payload.data.d);
            else await channelCollection.set(payload.data.d.id, payload.data.d);
        }
    }
}