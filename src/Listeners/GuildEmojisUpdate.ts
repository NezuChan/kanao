/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayGuildEmojisUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildEmojisUpdate,
    emitter: container.gateway
}))

export class GuildEmojisUpdate extends Listener {
    public async run(payload: { data: GatewayGuildEmojisUpdateDispatch }): Promise<void> {
        const channelCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.EMOJI_KEY}` : Constants.EMOJI_KEY });

        const emojis = await channelCollection.filter((_, key) => key.startsWith(payload.data.d.guild_id));
        for (const [key] of emojis) await channelCollection.delete(key);
        for (const emoji of payload.data.d.emojis) if (emoji.id) await channelCollection.set(`${payload.data.d.guild_id}:${emoji.id}`, emoji);

        this.container.gateway.amqp.sender.publish(process.env.USE_ROUTING === "true" ? this.container.gateway.clientId : payload.data.t, {
            ...payload,
            old: emojis
        }, { persistent: false });
    }
}
