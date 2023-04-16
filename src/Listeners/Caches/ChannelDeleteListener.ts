import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayChannelDeleteDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { clientId, stateChannels } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";

export class ChannelPintsUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelDelete,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelDeleteDispatch }): Promise<void> {
        if ("guild_id" in payload.data.d && payload.data.d.guild_id) {
            await this.store.redis.unlink(`${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.guild_id}:${payload.data.d.id}`);
        } else {
            await this.store.redis.unlink(`${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.id}`);
        }
    }
}
