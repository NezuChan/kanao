import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildRoleDeleteDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateRoles } from "../../../config.js";

export class GuildRoleDeleteListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildRoleDelete
        });
    }

    public async run(payload: { data: GatewayGuildRoleDeleteDispatch; shardId: number; }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.ROLE_KEY, payload.data.d.role_id, payload.data.d.guild_id));

        if (stateRoles) {
            await this.store.redis.unlink(GenKey(RedisKey.ROLE_KEY, payload.data.d.role_id, payload.data.d.guild_id));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: old === null ? null : JSON.parse(old)
        })));
    }
}
