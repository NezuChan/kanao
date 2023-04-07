/* eslint-disable class-methods-use-this */
import { cast } from "@sapphire/utilities";
import { APIGuildChannel, ChannelType, GatewayDispatchEvents, GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildCreate,
    emitter: container.gateway
}))

export class GuildCreateListener extends Listener {
    public async run(payload: { data: GatewayGuildCreateDispatch }): Promise<void> {
        if (payload.data.d.unavailable) { return; }

        const old = await this.container.gateway.cache.guilds.get(payload.data.d.id);

        if (!old) this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, payload, { persistent: false });

        for (const member of payload.data.d.members) {
            if (Util.optionalEnv<boolean>("STATE_USER", "true")) {
                await this.container.gateway.redis.sadd(this.container.gateway.genKey(Constants.USER_KEY, true), `${payload.data.d.id}:${member.user!.id}`);
                await this.container.gateway.cache.users.set(member.user!.id, member.user);
            }
            if (Util.optionalEnv<boolean>("STATE_MEMBER", "true")) {
                await this.container.gateway.redis.sadd(this.container.gateway.genKey(Constants.MEMBER_KEY, true), `${payload.data.d.id}:${member.user!.id}`);
                await this.container.gateway.cache.members.set(`${payload.data.d.id}:${member.user!.id}`, { ...member, user: Util.optionalEnv<boolean>("STATE_USER", "true") ? { } : member.user });
            }
        }

        for (const role of payload.data.d.roles) {
            if (Util.optionalEnv<boolean>("STATE_ROLE", "true")) {
                await this.container.gateway.redis.sadd(this.container.gateway.genKey(Constants.ROLE_KEY, true), `${payload.data.d.id}:${role.id}`);
                await this.container.gateway.cache.roles.set(`${payload.data.d.id}:${role.id}`, role);
            }
        }

        for (const voiceState of payload.data.d.voice_states) {
            if (Util.optionalEnv<boolean>("STATE_VOICE", "true")) {
                await this.container.gateway.redis.sadd(this.container.gateway.genKey(Constants.VOICE_KEY, true), `${payload.data.d.id}:${voiceState.user_id}`);
                await this.container.gateway.cache.states.set(`${payload.data.d.id}:${voiceState.user_id}`, voiceState);
            }
        }

        for (const channel of payload.data.d.channels) {
            if (Util.optionalEnv<boolean>("STATE_CHANNEL", "true")) {
                await this.container.gateway.redis.sadd(this.container.gateway.genKey(Constants.CHANNEL_KEY, true), `${payload.data.d.id}:${channel.id}`);
                cast<APIGuildChannel<ChannelType>>(channel).guild_id = payload.data.d.id;
                await this.container.gateway.cache.channels.set(`${payload.data.d.id}:${channel.id}`, channel);
            }
        }

        for (const emoji of payload.data.d.emojis) {
            if (emoji.id) {
                if (Util.optionalEnv<boolean>("STATE_EMOJI", "true")) {
                    await this.container.gateway.redis.sadd(this.container.gateway.genKey(Constants.EMOJI_KEY, true), `${payload.data.d.id}:${emoji.id}`);
                    await this.container.gateway.cache.emojis.set(`${payload.data.d.id}:${emoji.id}`, emoji);
                }
            }
        }

        for (const presence of payload.data.d.presences) {
            if (Util.optionalEnv<boolean>("STATE_PRESENCE", "true")) {
                await this.container.gateway.redis.sadd(this.container.gateway.genKey(Constants.PRESENCE_KEY, true), `${payload.data.d.id}:${presence.user.id}`);
                await this.container.gateway.cache.presences.set(`${payload.data.d.id}:${presence.user.id}`, presence);
            }
        }

        payload.data.d.presences = [];
        payload.data.d.channels = [];
        payload.data.d.emojis = [];
        payload.data.d.voice_states = [];
        payload.data.d.members = [];
        payload.data.d.roles = [];

        await this.container.gateway.redis.sadd(this.container.gateway.genKey(Constants.GUILD_KEY, true), payload.data.d.id);
        await this.container.gateway.cache.guilds.set(payload.data.d.id, payload.data.d);
    }
}
