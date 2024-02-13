import { PieceContext } from "@sapphire/pieces";
import { Listener } from "../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayMessageCreateDispatch } from "discord-api-types/v10";
import { Message } from "@nezuchan/core";
import { Events } from "../../Utilities/EventEnums.js";

export class InteractionCreate extends Listener {
    public constructor(context: PieceContext) {
        super(context, {
            name: GatewayDispatchEvents.MessageCreate
        });
    }

    public run(payload: GatewayMessageCreateDispatch["d"]): void {
        const message = new Message(payload, this.container.client);
        this.container.client.emit(Events.MessageCreate, message);
    }
}
