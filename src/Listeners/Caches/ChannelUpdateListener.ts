import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayChannelUpdateDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { clientId, stateChannels } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";

export class ChannelUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelDelete,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelUpdateDispatch }): Promise<void> {
        if ("guild_id" in payload.data.d && payload.data.d.guild_id) {
            await this.store.redis.set(`${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.guild_id}:${payload.data.d.id}`, JSON.stringify(payload.data.d));
        } else {
            await this.store.redis.set(`${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.id}`, JSON.stringify(payload.data.d));
        }
    }
}
