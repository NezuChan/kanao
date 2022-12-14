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
        const collection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.GUILD_KEY });
        const memberCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MEMBER_KEY });
        const roleCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.ROLE_KEY });
        const voiceStateCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.VOICE_KEY });
        const channelCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.CHANNEL_KEY });
        const emojiCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.EMOJI_KEY });
        const presenceCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.PRESENCE_KEY });

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

        await collection.delete(payload.data.d.id);
    }
}
