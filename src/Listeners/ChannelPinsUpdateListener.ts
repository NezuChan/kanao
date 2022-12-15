/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { cast } from "@sapphire/utilities";
import { APIChannel, APIGuildTextChannel, GatewayChannelCreateDispatch, GatewayDispatchEvents, GuildTextChannelType } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.ChannelPinsUpdate,
    emitter: container.gateway
}))

export class ChannelPinsUpdateListener extends Listener {
    public async run(payload: { data: GatewayChannelCreateDispatch }): Promise<void> {
        const channelCollection = new RedisCollection<string, APIChannel>({ redis: this.container.gateway.redis, hash: Constants.CHANNEL_KEY });

        const channel = await channelCollection.get("guild_id" in payload.data.d && payload.data.d.guild_id ? `${payload.data.d.guild_id}:${payload.data.d.id}` : payload.data.d.id);
        if (channel && "last_pin_timestamp" in payload.data.d) cast<APIGuildTextChannel<GuildTextChannelType>>(channel).last_pin_timestamp = payload.data.d.last_pin_timestamp;
    }
}
