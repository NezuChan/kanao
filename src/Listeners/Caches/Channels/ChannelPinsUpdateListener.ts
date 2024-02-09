import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { APITextBasedChannel, GatewayChannelPinsUpdateDispatch, GuildTextChannelType, TextChannelType } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateChannels } from "../../../config.js";

export class ChannelPinsUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelPinsUpdate
        });
    }

    public async run(payload: { data: GatewayChannelPinsUpdateDispatch; shardId: number; }): Promise<unknown> {
        if (stateChannels) {
            if ("guild_id" in payload.data.d && payload.data.d.guild_id !== undefined) {
                const guild_channel = await this.store.redis.get(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.channel_id, payload.data.d.guild_id));
                if (guild_channel !== null) {
                    const channel = JSON.parse(guild_channel) as APITextBasedChannel<GuildTextChannelType>;
                    channel.last_pin_timestamp = payload.data.d.last_pin_timestamp;
                    await this.store.redis.set(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.channel_id, payload.data.d.guild_id), JSON.stringify(channel));
                }
                await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
                    ...payload.data,
                    d: guild_channel === null ? null : JSON.parse(guild_channel)
                })));
            } else {
                const non_guild_channel = await this.store.redis.get(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.channel_id));
                if (non_guild_channel !== null) {
                    const channel = JSON.parse(non_guild_channel) as APITextBasedChannel<TextChannelType>;
                    channel.last_pin_timestamp = payload.data.d.last_pin_timestamp;
                    await this.store.redis.set(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.channel_id), JSON.stringify(channel));
                }
                await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
                    ...payload.data,
                    d: non_guild_channel === null ? null : JSON.parse(non_guild_channel)
                })));
            }
        }

        return this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
