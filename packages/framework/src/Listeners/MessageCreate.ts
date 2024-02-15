import type { Message } from "@nezuchan/core";
import type { LoaderPieceContext } from "@sapphire/pieces";
import { Listener } from "../Stores/Listener.js";
import { Events } from "../Utilities/EventEnums.js";

export class MessageCreate extends Listener {
    public constructor(context: LoaderPieceContext) {
        super(context, {
            name: Events.MessageCreate
        });
    }

    public run(message: Message): void {
        if (message.author?.bot ?? message.webhookId) return;

        this.container.client.emit(Events.PreMessageParsed, message);
    }
}
