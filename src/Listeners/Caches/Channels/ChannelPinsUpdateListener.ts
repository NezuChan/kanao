import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { APITextBasedChannel, GatewayChannelPinsUpdateDispatch, GatewayDispatchEvents, GuildTextChannelType, TextChannelType } from "discord-api-types/v10";
import { stateChannels } from "../../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";

export class ChannelPinsUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelPinsUpdate,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelPinsUpdateDispatch }): Promise<void> {
        if ("guild_id" in payload.data.d && payload.data.d.guild_id) {
            const guild_channel = await this.store.redis.get(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.channel_id, payload.data.d.guild_id));
            if (guild_channel) {
                const channel = JSON.parse(guild_channel) as APITextBasedChannel<GuildTextChannelType>;
                channel.last_pin_timestamp = payload.data.d.last_pin_timestamp;
                await this.store.redis.set(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.channel_id, payload.data.d.guild_id), JSON.stringify(channel));
            }
        } else {
            const non_guild_channel = await this.store.redis.get(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.channel_id));
            if (non_guild_channel) {
                const channel = JSON.parse(non_guild_channel) as APITextBasedChannel<TextChannelType>;
                channel.last_pin_timestamp = payload.data.d.last_pin_timestamp;
                await this.store.redis.set(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.channel_id), JSON.stringify(channel));
            }
        }
    }
}
