import { members } from "@nezuchan/kanao-schema";
import type { GatewayGuildMemberRemoveDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { DispatchListener } from "../DispatchListener.js";

export class GuildMemberRemoveListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberRemove
        });
    }

    public async run(payload: { data: GatewayGuildMemberRemoveDispatch; shardId: number; }): Promise<void> {
        await this.container.client.drizzle.delete(members).where(eq(members.id, payload.data.d.user.id));

        await DispatchListener.dispatch(payload);
    }
}
