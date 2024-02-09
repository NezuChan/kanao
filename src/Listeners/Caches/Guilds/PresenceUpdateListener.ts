import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayPresenceUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, statePresences } from "../../../config.js";

export class PresenceUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.PresenceUpdate
        });
    }

    public async run(payload: { data: GatewayPresenceUpdateDispatch; shardId: number; }): Promise<void> {
        if (statePresences) {
            await this.store.redis.set(GenKey(RedisKey.PRESENCE_KEY, payload.data.d.user.id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
