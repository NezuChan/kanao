import { roles } from "@nezuchan/kanao-schema";
import type { GatewayGuildRoleCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { stateRoles } from "../../../config.js";
import { DispatchListener } from "../DispatchListener.js";

export class GuildRoleCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildRoleCreate
        });
    }

    public async run(payload: { data: GatewayGuildRoleCreateDispatch; shardId: number; }): Promise<void> {
        if (stateRoles) {
            await this.container.client.drizzle.insert(roles).values({
                id: payload.data.d.role.id,
                name: payload.data.d.role.name,
                permissions: payload.data.d.role.permissions,
                position: payload.data.d.role.position,
                color: payload.data.d.role.color,
                hoist: payload.data.d.role.hoist,
                guildId: payload.data.d.guild_id
            }).onConflictDoUpdate({
                target: roles.id,
                set: {
                    name: sql`EXCLUDED.name`,
                    permissions: sql`EXCLUDED.permissions`,
                    position: sql`EXCLUDED.position`,
                    color: sql`EXCLUDED.color`,
                    hoist: sql`EXCLUDED.hoist`
                }
            });
        }

        await DispatchListener.dispatch(payload);
    }
}
