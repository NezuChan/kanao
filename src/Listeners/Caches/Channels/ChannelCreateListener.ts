import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayChannelCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateChannels } from "../../../config.js";

export class ChannelCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelCreate
        });
    }

    public async run(payload: { data: GatewayChannelCreateDispatch; shardId: number; }): Promise<void> {
        if (stateChannels) {
            const key = "guild_id" in payload.data.d && payload.data.d.guild_id !== undefined ? GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id, payload.data.d.guild_id) : GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id);
            const exists = await this.store.redis.exists(key);
            await this.store.redis.set(key, JSON.stringify(payload.data.d));
            if (exists === 0) await this.store.redis.incr(GenKey(RedisKey.CHANNEL_KEY, RedisKey.COUNT));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
