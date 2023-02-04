/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildDeleteDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildDelete,
    emitter: container.gateway
}))

export class GuildDeleteListener extends Listener {
    public async run(payload: { data: GatewayGuildDeleteDispatch }): Promise<void> {
        const roles = await this.container.gateway.redis.smembers(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.ROLE_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.ROLE_KEY}${Constants.KEYS_SUFFIX}`).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const emojis = await this.container.gateway.redis.smembers(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.EMOJI_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.EMOJI_KEY}${Constants.KEYS_SUFFIX}`).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const members = await this.container.gateway.redis.smembers(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MEMBER_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.MEMBER_KEY}${Constants.KEYS_SUFFIX}`).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const channels = await this.container.gateway.redis.smembers(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.CHANNEL_KEY}${Constants.KEYS_SUFFIX}`).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const voiceStates = await this.container.gateway.redis.smembers(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.VOICE_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.VOICE_KEY}${Constants.KEYS_SUFFIX}`).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const presences = await this.container.gateway.redis.smembers(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.PRESENCE_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.PRESENCE_KEY}${Constants.KEYS_SUFFIX}`).then(x => x.filter(y => y.startsWith(payload.data.d.id)));

        for (const [key] of roles) await this.container.gateway.cache.roles.delete(key);
        for (const [key] of members) await this.container.gateway.cache.members.delete(key);
        for (const [key] of channels) await this.container.gateway.cache.channels.delete(key);
        for (const [key] of voiceStates) await this.container.gateway.cache.states.delete(key);
        for (const [key] of presences) await this.container.gateway.cache.presences.delete(key);
        for (const [key] of emojis) await this.container.gateway.cache.emojis.delete(key);

        if (!payload.data.d.unavailable) {
            this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
                ...payload,
                old: await this.container.gateway.cache.guilds.get(payload.data.d.id)
            }, { persistent: false });
        }

        await this.container.gateway.redis.srem(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.GUILD_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.GUILD_KEY}${Constants.KEYS_SUFFIX}`, payload.data.d.id);
        await this.container.gateway.cache.guilds.delete(payload.data.d.id);
    }
}
