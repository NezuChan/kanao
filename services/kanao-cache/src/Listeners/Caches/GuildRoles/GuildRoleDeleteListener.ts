import { roles } from "@nezuchan/kanao-schema";
import type { GatewayGuildRoleDeleteDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { DispatchListener } from "../DispatchListener.js";

export class GuildRoleDeleteListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildRoleDelete
        });
    }

    public async run(payload: { data: GatewayGuildRoleDeleteDispatch; shardId: number; }): Promise<void> {
        await this.container.client.drizzle.delete(roles).where(eq(roles.id, payload.data.d.role_id));

        await DispatchListener.dispatch(payload);
    }
}
