import { messages } from "@nezuchan/kanao-schema";
import type { GatewayMessageDeleteDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { DispatchListener } from "../DispatchListener.js";

export class MessageDeleteListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageDelete
        });
    }

    public async run(payload: { data: GatewayMessageDeleteDispatch; shardId: number; }): Promise<void> {
        await this.container.client.drizzle.delete(messages).where(eq(messages.id, payload.data.d.id));

        await DispatchListener.dispatch(payload);
    }
}
