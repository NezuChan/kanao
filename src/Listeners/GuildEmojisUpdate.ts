/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildEmojisUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { RedisKey } from "@nezuchan/constants";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildEmojisUpdate,
    emitter: container.gateway
}))

export class GuildEmojisUpdate extends Listener {
    public async run(payload: { data: GatewayGuildEmojisUpdateDispatch }): Promise<void> {
        const emojis = [];

        const keys = await Util.sscanStreamPromise(this.container.gateway.redis, this.container.gateway.genKey(RedisKey.EMOJI_KEY, true), `${payload.data.d.guild_id}:*`, 1000);
        for (const key of keys) {
            const emoji = await this.container.gateway.cache.emojis.get(key);
            if (emoji && payload.data.d.emojis.map(x => x.id).includes(emoji.id)) {
                await this.container.gateway.redis.srem(this.container.gateway.genKey(RedisKey.EMOJI_KEY, true), `${payload.data.d.guild_id}:${emoji.id!}`);
                await this.container.gateway.cache.emojis.delete(emoji.id!);
                emojis.push(emoji);
            }
        }

        for (const emoji of payload.data.d.emojis) {
            if (emoji.id) {
                await this.container.gateway.redis.sadd(this.container.gateway.genKey(RedisKey.EMOJI_KEY, true), `${payload.data.d.guild_id}:${emoji.id}`);
                await this.container.gateway.cache.emojis.set(`${payload.data.d.guild_id}:${emoji.id}`, emoji);
            }
        }

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
            ...payload,
            old: emojis
        }, { persistent: false });
    }
}
