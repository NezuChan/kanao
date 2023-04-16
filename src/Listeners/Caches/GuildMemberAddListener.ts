import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayGuildMemberAddDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { clientId, stateMembers, stateUsers } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";

export class GuildMemberAddListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberAdd
        });
    }

    public async run(payload: { data: GatewayGuildMemberAddDispatch }): Promise<void> {
        if (stateUsers) {
            await this.store.redis.set(`${clientId}:${RedisKey.USER_KEY}:${payload.data.d.user!.id}`, JSON.stringify(payload.data.d.user));
            await this.store.redis.sadd(`${clientId}:${RedisKey.USER_KEY}${RedisKey.KEYS_SUFFIX}`, `${clientId}:${RedisKey.USER_KEY}:${payload.data.d.user!.id}`);
        }

        if (stateMembers) {
            await this.store.redis.set(`${clientId}:${RedisKey.MEMBER_KEY}:${payload.data.d.guild_id}:${payload.data.d.user!.id}`, JSON.stringify(payload.data.d));
            await this.store.redis.sadd(`${clientId}:${RedisKey.MEMBER_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.guild_id}`, `${clientId}:${RedisKey.MEMBER_KEY}:${payload.data.d.guild_id}:${payload.data.d.user!.id}`);
        }
    }
}
