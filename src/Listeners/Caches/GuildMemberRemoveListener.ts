import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildMemberRemoveDispatch } from "discord-api-types/v10";
import { clientId, stateMembers } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";

export class GuildMemberRemoveListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberRemove
        });
    }

    public async run(payload: { data: GatewayGuildMemberRemoveDispatch }): Promise<void> {
        if (stateMembers) {
            await this.store.redis.unlink(`${clientId}:${RedisKey.MEMBER_KEY}:${payload.data.d.guild_id}:${payload.data.d.user.id}`);
            await this.store.redis.srem(`${clientId}:${RedisKey.MEMBER_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.guild_id}`, `${clientId}:${RedisKey.MEMBER_KEY}:${payload.data.d.guild_id}:${payload.data.d.user.id}`);
        }
    }
}
