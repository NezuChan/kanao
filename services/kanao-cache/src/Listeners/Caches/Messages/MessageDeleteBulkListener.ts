import { messages } from "@nezuchan/kanao-schema";
import type { GatewayMessageDeleteBulkDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { inArray } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { DispatchListener } from "../DispatchListener.js";

export class MessageDeleteBulkListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageDeleteBulk
        });
    }

    public async run(payload: { data: GatewayMessageDeleteBulkDispatch; shardId: number; }): Promise<void> {
        await this.container.client.drizzle.delete(messages).where(inArray(messages.id, payload.data.d.ids));

        await DispatchListener.dispatch(payload);
    }
}
