/* eslint-disable class-methods-use-this */
import { cast } from "@sapphire/utilities";
import { APIGuildTextChannel, GatewayChannelPinsUpdateDispatch, GatewayDispatchEvents, GuildTextChannelType } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.ChannelPinsUpdate,
    emitter: container.gateway
}))

export class ChannelPinsUpdateListener extends Listener {
    public async run(payload: { data: GatewayChannelPinsUpdateDispatch }): Promise<void> {
        const channel = await this.container.gateway.cache.channels.get("guild_id" in payload.data.d && payload.data.d.guild_id ? `${payload.data.d.guild_id}:${payload.data.d.channel_id}` : payload.data.d.channel_id);
        if (channel && "last_pin_timestamp" in payload.data.d) cast<APIGuildTextChannel<GuildTextChannelType>>(channel).last_pin_timestamp = payload.data.d.last_pin_timestamp;

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload }, { persistent: false });
    }
}
