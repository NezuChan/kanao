import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildRoleCreateDispatch } from "discord-api-types/v10";
import { clientId, stateRoles } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class GuildRoleCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildRoleCreate
        });
    }

    public async run(payload: { data: GatewayGuildRoleCreateDispatch; shardId: number }): Promise<void> {
        if (stateRoles) {
            await this.store.redis.set(GenKey(RedisKey.ROLE_KEY, payload.data.d.role.id, payload.data.d.guild_id), JSON.stringify(payload.data.d.role));
        }
        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
