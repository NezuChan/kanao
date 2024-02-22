import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { roles } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildRoleUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateRoles } from "../../../config.js";

export class GuildRoleUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildRoleUpdate
        });
    }

    public async run(payload: { data: GatewayGuildRoleUpdateDispatch; shardId: number; }): Promise<void> {
        if (stateRoles) {
            await this.container.client.drizzle.insert(roles).values({
                id: payload.data.d.role.id,
                name: payload.data.d.role.name,
                permissions: payload.data.d.role.permissions,
                position: payload.data.d.role.position,
                color: payload.data.d.role.color,
                hoist: payload.data.d.role.hoist
            }).onConflictDoUpdate({
                target: roles.id,
                set: {
                    name: payload.data.d.role.name,
                    permissions: payload.data.d.role.permissions,
                    position: payload.data.d.role.position,
                    color: payload.data.d.role.color,
                    hoist: payload.data.d.role.hoist
                }
            });
        }

        await this.container.client.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}