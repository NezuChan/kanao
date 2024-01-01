import { WebSocketShardEvents } from "@discordjs/ws";
import { Listener, ListenerContext } from "../Stores/Listener.js";
import { GatewayReadyDispatch } from "discord-api-types/v10";
import { GenKey } from "../Utilities/GenKey.js";
import { RedisKey } from "@nezuchan/constants";
import { redisScan } from "@nezuchan/utilities";
import { redisScanCount } from "../config.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Ready
        });
    }

    public async run(payload: { data: { data: GatewayReadyDispatch["d"] }; shardId: number }): Promise<unknown> {
        await this.store.redis.set(GenKey(RedisKey.BOT_USER_KEY), JSON.stringify(payload.data.data.user));

        // Update counters
        if (payload.shardId === 0) {
            const guild = await redisScan(this.store.redis, GenKey(RedisKey.GUILD_KEY), redisScanCount);
            await this.store.redis.set(GenKey(RedisKey.GUILD_KEY, RedisKey.COUNT), guild.length);

            const channel = await redisScan(this.store.redis, GenKey(RedisKey.CHANNEL_KEY), redisScanCount);
            await this.store.redis.set(GenKey(RedisKey.CHANNEL_KEY, RedisKey.COUNT), channel.length);

            const user = await redisScan(this.store.redis, GenKey(RedisKey.USER_KEY), redisScanCount);
            await this.store.redis.set(GenKey(RedisKey.USER_KEY, RedisKey.COUNT), user.length);
        }

        return this.logger.info(`Shard ${payload.shardId} is ready !`);
    }
}
