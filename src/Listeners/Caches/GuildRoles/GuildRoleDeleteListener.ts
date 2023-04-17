import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildRoleDeleteDispatch } from "discord-api-types/v10";
import { stateRoles } from "../../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";

export class GuildRoleDeleteListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildRoleDelete,
            enabled: stateRoles
        });
    }

    public async run(payload: { data: GatewayGuildRoleDeleteDispatch }): Promise<void> {
        await this.store.redis.unlink(GenKey(RedisKey.ROLE_KEY, payload.data.d.role_id, payload.data.d.guild_id));
        await this.store.redis.srem(GenKey(`${RedisKey.ROLE_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.guild_id), GenKey(RedisKey.ROLE_KEY, payload.data.d.role_id, payload.data.d.guild_id));
    }
}
