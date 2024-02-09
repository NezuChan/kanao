import { WebSocketShardEvents } from "@discordjs/ws";
import { RedisKey } from "@nezuchan/constants";
import type { GatewayReadyDispatch } from "discord-api-types/v10";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";
import { GenKey } from "../Utilities/GenKey.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Ready
        });
    }

    public async run(payload: { data: { data: GatewayReadyDispatch["d"]; }; shardId: number; }): Promise<unknown> {
        await this.store.redis.set(GenKey(RedisKey.BOT_USER_KEY), JSON.stringify(payload.data.data.user));

        this.logger.info(`Shard ${payload.shardId} is ready !`);
    }
}
