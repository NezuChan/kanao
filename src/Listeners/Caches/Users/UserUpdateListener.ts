import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayUserUpdateDispatch } from "discord-api-types/v10";
import { stateMessages } from "../../../config.js";
import { RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";

export class UserUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.UserUpdate,
            enabled: stateMessages
        });
    }

    public async run(payload: { data: GatewayUserUpdateDispatch }): Promise<void> {
        await this.store.redis.set(GenKey(RedisKey.BOT_USER_KEY), JSON.stringify(payload.data.d));
    }
}
