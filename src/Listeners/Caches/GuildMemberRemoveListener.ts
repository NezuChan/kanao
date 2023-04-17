import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildMemberRemoveDispatch } from "discord-api-types/v10";
import { stateMembers } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../Utilities/GenKey.js";

export class GuildMemberRemoveListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberRemove
        });
    }

    public async run(payload: { data: GatewayGuildMemberRemoveDispatch }): Promise<void> {
        if (stateMembers) {
            await this.store.redis.unlink(GenKey(RedisKey.MEMBER_KEY, payload.data.d.user.id, payload.data.d.guild_id));
            await this.store.redis.srem(GenKey(`${RedisKey.MEMBER_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.guild_id), GenKey(RedisKey.MEMBER_KEY, payload.data.d.user.id, payload.data.d.guild_id));
        }
    }
}
