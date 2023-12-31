import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildRoleDeleteDispatch } from "discord-api-types/v10";
import { clientId, stateRoles } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class GuildRoleDeleteListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildRoleDelete
        });
    }

    public async run(payload: { data: GatewayGuildRoleDeleteDispatch; shardId: number }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.ROLE_KEY, payload.data.d.role_id, payload.data.d.guild_id));

        if (stateRoles) {
            await this.store.redis.unlink(GenKey(RedisKey.ROLE_KEY, payload.data.d.role_id, payload.data.d.guild_id));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: old ? JSON.parse(old) : null
        })));
    }
}
