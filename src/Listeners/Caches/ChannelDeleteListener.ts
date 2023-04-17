import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayChannelDeleteDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { stateChannels } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../Utilities/GenKey.js";

export class ChannelPintsUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelDelete,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelDeleteDispatch }): Promise<void> {
        if ("guild_id" in payload.data.d && payload.data.d.guild_id) {
            await this.store.redis.unlink(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id, payload.data.d.guild_id));
        } else {
            await this.store.redis.unlink(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id));
        }
    }
}
