import { WebSocketShardEvents } from "@discordjs/ws";
import { Listener, ListenerContext } from "../Stores/Listener.js";
import { GatewayReadyDispatch } from "discord-api-types/v10";
import { GenKey } from "../Utilities/GenKey.js";
import { RedisKey } from "@nezuchan/constants";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Ready
        });
    }

    public async run(payload: { data: { data: GatewayReadyDispatch }; shardId: number }): Promise<unknown> {
        await this.store.redis.set(GenKey(RedisKey.BOT_USER_KEY), JSON.stringify(payload.data.data.d.user));
        return this.logger.info(`Shard ${payload.shardId} is ready !`);
    }
}
