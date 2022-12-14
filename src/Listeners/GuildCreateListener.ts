/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { cast } from "@sapphire/utilities";
import { APIGuildChannel, ChannelType, GatewayDispatchEvents, GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildCreate,
    emitter: container.gateway
}))

export class GuildCreateListener extends Listener {
    public async run(payload: { data: GatewayGuildCreateDispatch }): Promise<void> {
        const collection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.GUILD_KEY });
        const memberCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MEMBER_KEY });
        const userCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.USER_KEY });
        const roleCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.ROLE_KEY });
        const voiceStateCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.VOICE_KEY });
        const channelCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.CHANNEL_KEY });
        const emojiCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.EMOJI_KEY });
        const presenceCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.PRESENCE_KEY });

        for (const member of payload.data.d.members) {
            if (Util.optionalEnv<boolean>("STATE_USER", "true")) await userCollection.set(member.user!.id, member.user);
            if (Util.optionalEnv<boolean>("STATE_MEMBER", "true")) await memberCollection.set(`${payload.data.d.id}:${member.user!.id}`, { ...member, user: Util.optionalEnv<boolean>("STATE_USER", "true") ? { } : member.user });
        }

        for (const role of payload.data.d.roles) {
            if (Util.optionalEnv<boolean>("STATE_ROLE", "true")) await roleCollection.set(`${payload.data.d.id}:${role.id}`, role);
        }

        for (const voiceState of payload.data.d.voice_states) {
            if (Util.optionalEnv<boolean>("STATE_VOICE", "true")) await voiceStateCollection.set(`${payload.data.d.id}:${voiceState.user_id}`, voiceState);
        }

        for (const channel of payload.data.d.channels) {
            if (Util.optionalEnv<boolean>("STATE_CHANNEL", "true")) {
                cast<APIGuildChannel<ChannelType>>(channel).guild_id = payload.data.d.id;
                await channelCollection.set(`${payload.data.d.id}:${channel.id}`, channel);
            }
        }

        for (const emoji of payload.data.d.emojis) {
            if (emoji.id) {
                if (Util.optionalEnv<boolean>("STATE_EMOJI", "true")) await emojiCollection.set(`${payload.data.d.id}:${emoji.id}`, emoji);
            }
        }

        for (const presence of payload.data.d.presences) {
            if (Util.optionalEnv<boolean>("STATE_PRESENCE", "true")) await presenceCollection.set(`${payload.data.d.id}:${presence.user.id}`, presence);
        }

        payload.data.d.presences = [];
        payload.data.d.channels = [];
        payload.data.d.emojis = [];
        payload.data.d.voice_states = [];
        payload.data.d.members = [];
        payload.data.d.roles = [];

        await collection.set(payload.data.d.id, payload.data.d);
    }
}
