/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayGuildDeleteDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildDelete,
    emitter: container.gateway
}))

export class GuildDeleteListener extends Listener {
    public async run(payload: { data: GatewayGuildDeleteDispatch }): Promise<void> {
        const collection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.GUILD_KEY}` : Constants.GUILD_KEY });
        const memberCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MEMBER_KEY}` : Constants.MEMBER_KEY });
        const roleCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.ROLE_KEY}` : Constants.ROLE_KEY });
        const voiceStateCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.VOICE_KEY}` : Constants.VOICE_KEY });
        const channelCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.CHANNEL_KEY}` : Constants.CHANNEL_KEY });
        const emojiCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.EMOJI_KEY}` : Constants.EMOJI_KEY });
        const presenceCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.PRESENCE_KEY}` : Constants.PRESENCE_KEY });


        const roles = await roleCollection.filter((_, key) => key.startsWith(payload.data.d.id));
        const emojis = await emojiCollection.filter((_, key) => key.startsWith(payload.data.d.id));
        const members = await memberCollection.filter((_, key) => key.startsWith(payload.data.d.id));
        const channels = await channelCollection.filter((_, key) => key.startsWith(payload.data.d.id));
        const voiceStates = await voiceStateCollection.filter((_, key) => key.startsWith(payload.data.d.id));
        const presences = await presenceCollection.filter((_, key) => key.startsWith(payload.data.d.id));

        for (const [key] of roles) await roleCollection.delete(key);
        for (const [key] of members) await memberCollection.delete(key);
        for (const [key] of channels) await channelCollection.delete(key);
        for (const [key] of voiceStates) await voiceStateCollection.delete(key);
        for (const [key] of presences) await presenceCollection.delete(key);
        for (const [key] of emojis) await emojiCollection.delete(key);

        if (!payload.data.d.unavailable) {
            this.container.gateway.amqp.sender.publish(process.env.USE_ROUTING === "true" ? this.container.gateway.clientId : payload.data.t, {
                ...payload,
                old: {
                    ...await collection.get(payload.data.d.id) ?? {},
                    roles: roles.toJSON(),
                    emojis: emojis.toJSON(),
                    members: members.toJSON(),
                    channels: channels.toJSON(),
                    voiceStates: voiceStates.toJSON(),
                    presences: presences.toJSON()
                }
            }, { persistent: false });
        }

        await collection.delete(payload.data.d.id);
    }
}
