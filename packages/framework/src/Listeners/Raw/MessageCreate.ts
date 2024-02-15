import { Message } from "@nezuchan/core";
import type { LoaderPieceContext } from "@sapphire/pieces";
import type { GatewayMessageCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { Listener } from "../../Stores/Listener.js";
import { Events } from "../../Utilities/EventEnums.js";

export class InteractionCreate extends Listener {
    public constructor(context: LoaderPieceContext) {
        super(context, {
            name: GatewayDispatchEvents.MessageCreate
        });
    }

    public run(payload: GatewayMessageCreateDispatch["d"]): void {
        const message = new Message(payload, this.container.client);
        this.container.client.emit(Events.MessageCreate, message);
    }
}
