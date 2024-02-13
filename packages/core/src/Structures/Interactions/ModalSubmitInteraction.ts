import { ModalSubmitActionRowComponent } from "discord-api-types/v10";
import { BaseInteraction } from "./BaseInteraction.js";
import { Message } from "../Message.js";

export class ModalSubmitInteraction extends BaseInteraction {
    public get customId(): string | null {
        return this.data.data && "custom_id" in this.data.data ? this.data.data.custom_id : null;
    }

    public get components(): ModalSubmitActionRowComponent[] {
        return this.data.data && "components" in this.data.data ? this.data.data.components : [];
    }

    public get message(): Message | null {
        return "message" in this.data && this.data.message ? new Message(this.data.message, this.client) : null;
    }
}
