import { guilds } from "@nezuchan/kanao-schema";
import type { GatewayGuildDeleteDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { DispatchListener } from "../DispatchListener.js";

export class GuildDeleteListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildDelete
        });
    }

    public async run(payload: { data: GatewayGuildDeleteDispatch; shardId: number; }): Promise<void> {
        await this.container.client.drizzle.delete(guilds).where(eq(guilds.id, payload.data.d.id));

        await DispatchListener.dispatch(payload);
    }
}
