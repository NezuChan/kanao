import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayChannelDeleteDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateChannels } from "../../../config.js";

export class ChannelPintsUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelDelete,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelDeleteDispatch; shardId: number; }): Promise<void> {
        const channel = await this.store.redis.get(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id, "guild_id" in payload.data.d && payload.data.d.guild_id !== undefined ? payload.data.d.guild_id : undefined));

        await ("guild_id" in payload.data.d && payload.data.d.guild_id !== undefined ? this.store.redis.unlink(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.guild_id)) : this.store.redis.unlink(GenKey(RedisKey.CHANNEL_KEY)));
        await this.store.redis.decr(GenKey(RedisKey.CHANNEL_KEY, RedisKey.COUNT));

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: channel === null ? null : JSON.parse(channel)
        })));
    }
}
