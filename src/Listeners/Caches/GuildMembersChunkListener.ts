import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildMembersChunkDispatch } from "discord-api-types/v10";
import { clientId, stateMembers, stateUsers } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";

export class GuildMembersChunkListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMembersChunk
        });
    }

    public async run(payload: { data: GatewayGuildMembersChunkDispatch }): Promise<void> {
        if (stateMembers || stateUsers) {
            for (const member of payload.data.d.members) {
                await this.store.redis.set(`${clientId}:${RedisKey.MEMBER_KEY}:${payload.data.d.guild_id}:${member.user!.id}`, JSON.stringify(member));
                await this.store.redis.sadd(`${clientId}:${RedisKey.MEMBER_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.guild_id}`, `${clientId}:${RedisKey.MEMBER_KEY}:${payload.data.d.guild_id}:${member.user!.id}`);
            }

            if (stateUsers) {
                for (const member of payload.data.d.members) {
                    await this.store.redis.set(`${clientId}:${RedisKey.USER_KEY}:${member.user!.id}`, JSON.stringify(member.user));
                    await this.store.redis.sadd(`${clientId}:${RedisKey.USER_KEY}${RedisKey.KEYS_SUFFIX}`, `${clientId}:${RedisKey.USER_KEY}:${member.user!.id}`);
                }
            }
        }
    }
}
