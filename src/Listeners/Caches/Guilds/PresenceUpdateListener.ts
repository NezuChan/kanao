import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayPresenceUpdate } from "discord-api-types/v10";
import { clientId, statePresences } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class GuildMemberUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.PresenceUpdate
        });
    }

    public async run(payload: { data: GatewayPresenceUpdate; shardId: number }): Promise<void> {
        if (statePresences) {
            await this.store.redis.set(GenKey(`${RedisKey.PRESENCE_KEY}`, payload.data.user.id, payload.data.guild_id), JSON.stringify(payload.data));
            await this.store.redis.sadd(GenKey(`${RedisKey.PRESENCE_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.user.id, payload.data.guild_id), GenKey(`${RedisKey.PRESENCE_KEY}`, payload.data.user.id, payload.data.guild_id));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
