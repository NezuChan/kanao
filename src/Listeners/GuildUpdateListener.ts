/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayGuildUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildUpdate,
    emitter: container.gateway
}))

export class GuildUpdateListener extends Listener {
    public async run(payload: { data: GatewayGuildUpdateDispatch }): Promise<void> {
        const guildCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.GUILD_KEY}` : Constants.GUILD_KEY });

        const old = await guildCollection.get(payload.data.d.id);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
            ...payload,
            old
        }, { persistent: false });

        await guildCollection.set(payload.data.d.id, payload.data.d);
    }
}
