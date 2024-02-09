import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildEmojisUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId } from "../../../config.js";

export class GuildEmojisUpdate extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildEmojisUpdate
        });
    }

    public async run(payload: { data: GatewayGuildEmojisUpdateDispatch; shardId: number; }): Promise<void> {
        // let old_emojis: string[] = [];

        // if (stateEmojis) {
        //     old_emojis = await redisScan(this.store.redis, GenKey(RedisKey.EMOJI_KEY, payload.data.d.guild_id), redisScanCount);
        //     for (const emoji of old_emojis) {
        //         await this.store.redis.unlink(emoji);
        //     }

        //     for (const emoji of payload.data.d.emojis) {
        //         if (emoji.id !== null) {
        //             await this.store.redis.set(GenKey(RedisKey.EMOJI_KEY, emoji.id, payload.data.d.guild_id), JSON.stringify(emoji));
        //         }
        //     }
        // }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data
        })));
    }
}
