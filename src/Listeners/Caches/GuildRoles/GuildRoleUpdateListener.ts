import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildRoleUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { roles } from "../../../Schema/index.ts";
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
            await this.store.drizzle.update(roles).set({
                name: payload.data.d.role.name
            }).where(eq(roles.id, payload.data.d.role.id));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data
        })));
    }
}
