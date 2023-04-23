import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayChannelDeleteDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { clientId, stateChannels } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class ChannelPintsUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelDelete,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelDeleteDispatch; shardId: number }): Promise<void> {
        const channel = await this.store.redis.get(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id, "guild_id" in payload.data.d && payload.data.d.guild_id ? payload.data.d.guild_id : undefined));

        if ("guild_id" in payload.data.d && payload.data.d.guild_id) {
            await this.store.redis.unlink(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id, payload.data.d.guild_id));
        } else {
            await this.store.redis.unlink(GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id));
        }

        this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: channel ? JSON.parse(channel) : null
        })));
    }
}
