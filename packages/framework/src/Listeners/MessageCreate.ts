/* eslint-disable no-useless-return */
import { PieceContext } from "@sapphire/pieces";
import { Listener } from "../Stores/Listener.js";
import { Events } from "../Utilities/EventEnums.js";
import { Message } from "@nezuchan/core";

export class MessageCreate extends Listener {
    public constructor(context: PieceContext) {
        super(context, {
            name: Events.MessageCreate
        });
    }

    public run(message: Message): void {
        if (message.author?.bot ?? message.webhookId) return;

        this.container.client.emit(Events.PreMessageParsed, message);
    }
}
