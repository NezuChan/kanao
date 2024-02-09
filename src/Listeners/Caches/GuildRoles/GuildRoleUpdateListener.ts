import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildRoleUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateRoles } from "../../../config.js";

export class GuildRoleUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildRoleUpdate
        });
    }

    public async run(payload: { data: GatewayGuildRoleUpdateDispatch; shardId: number; }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.ROLE_KEY, payload.data.d.role.id, payload.data.d.guild_id));

        if (stateRoles) {
            await this.store.redis.set(GenKey(RedisKey.ROLE_KEY, payload.data.d.role.id, payload.data.d.guild_id), JSON.stringify(payload.data.d.role));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: old === null ? null : JSON.parse(old)
        })));
    }
}
