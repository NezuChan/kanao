/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayGuildMemberAddDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.GuildMemberAdd,
    emitter: container.gateway
}))

export class GuildMemberAddListener extends Listener {
    public async run(payload: { data: GatewayGuildMemberAddDispatch }): Promise<void> {
        if (Util.optionalEnv<boolean>("STATE_USER", "true")) {
            await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.USER_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.USER_KEY}${Constants.KEYS_SUFFIX}`, payload.data.d.user!.id);
            await this.container.gateway.cache.users.set(payload.data.d.user!.id, payload.data.d.user);
        }
        if (Util.optionalEnv("STATE_MEMBER", "true")) {
            await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MEMBER_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.MEMBER_KEY}${Constants.KEYS_SUFFIX}`, `${payload.data.d.guild_id}:${payload.data.d.user!.id}`);
            await this.container.gateway.cache.members.set(`${payload.data.d.guild_id}:${payload.data.d.user!.id}`, { ...payload.data.d, user: Util.optionalEnv<boolean>("STATE_USER", "true") ? { } : payload.data.d.user });
        }

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload }, { persistent: false });
    }
}
