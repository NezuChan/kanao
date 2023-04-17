import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayMessageDeleteDispatch } from "discord-api-types/v10";
import { stateMessages } from "../../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";

export class MessageUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageDelete,
            enabled: stateMessages
        });
    }

    public async run(payload: { data: GatewayMessageDeleteDispatch }): Promise<void> {
        await this.store.redis.unlink(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));
        await this.store.redis.srem(GenKey(`${RedisKey.MESSAGE_KEY}${RedisKey.KEYS_SUFFIX}`, undefined, payload.data.d.guild_id), GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));
    }
}
