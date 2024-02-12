import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildRoleCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { roles } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateRoles } from "../../../config.js";

export class GuildRoleCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildRoleCreate
        });
    }

    public async run(payload: { data: GatewayGuildRoleCreateDispatch; shardId: number; }): Promise<void> {
        if (stateRoles) {
            await this.store.drizzle.insert(roles).values({
                id: payload.data.d.role.id,
                name: payload.data.d.role.name,
                permissions: payload.data.d.role.permissions,
                position: payload.data.d.role.position,
                color: payload.data.d.role.color,
                hoist: payload.data.d.role.hoist
            });
        }
        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
