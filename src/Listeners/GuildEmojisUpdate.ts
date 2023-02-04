/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildEmojisUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildEmojisUpdate,
    emitter: container.gateway
}))

export class GuildEmojisUpdate extends Listener {
    public async run(payload: { data: GatewayGuildEmojisUpdateDispatch }): Promise<void> {
        const emojis = await this.container.gateway.cache.emojis.filter((_, key) => key.startsWith(payload.data.d.guild_id));
        for (const [key] of emojis) await this.container.gateway.cache.emojis.delete(key);
        for (const emoji of payload.data.d.emojis) if (emoji.id) await this.container.gateway.cache.emojis.set(`${payload.data.d.guild_id}:${emoji.id}`, emoji);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
            ...payload,
            old: emojis
        }, { persistent: false });
    }
}
