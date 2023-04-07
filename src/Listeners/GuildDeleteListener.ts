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
        const roles = await this.container.gateway.redis.smembers(this.container.gateway.genKey(Constants.ROLE_KEY, true)).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const emojis = await this.container.gateway.redis.smembers(this.container.gateway.genKey(Constants.EMOJI_KEY, true)).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const members = await this.container.gateway.redis.smembers(this.container.gateway.genKey(Constants.MEMBER_KEY, true)).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const channels = await this.container.gateway.redis.smembers(this.container.gateway.genKey(Constants.CHANNEL_KEY, true)).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const voiceStates = await this.container.gateway.redis.smembers(this.container.gateway.genKey(Constants.VOICE_KEY, true)).then(x => x.filter(y => y.startsWith(payload.data.d.id)));
        const presences = await this.container.gateway.redis.smembers(this.container.gateway.genKey(Constants.PRESENCE_KEY, true)).then(x => x.filter(y => y.startsWith(payload.data.d.id)));

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

        await this.container.gateway.redis.srem(this.container.gateway.genKey(Constants.GUILD_KEY, true), payload.data.d.id);
        await this.container.gateway.cache.guilds.delete(payload.data.d.id);
    }
}
