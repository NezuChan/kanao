import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayMessageDeleteBulkDispatch } from "discord-api-types/v10";
import { stateMessages } from "../../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";

export class MessageDeleteBulkListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageDeleteBulk,
            enabled: stateMessages
        });
    }

    public async run(payload: { data: GatewayMessageDeleteBulkDispatch }): Promise<void> {
        for (const id of payload.data.d.ids) {
            if (stateMessages) {
                await this.store.redis.unlink(GenKey(RedisKey.MESSAGE_KEY, id, payload.data.d.guild_id));
                await this.store.redis.srem(GenKey(`${RedisKey.MESSAGE_KEY}${RedisKey.KEYS_SUFFIX}`, undefined, payload.data.d.guild_id), GenKey(RedisKey.MESSAGE_KEY, id, payload.data.d.guild_id));
            }
        }
    }
}
