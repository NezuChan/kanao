import { APIInteractionResponseCallbackData, APIMessage, ComponentType, InteractionResponseType, Routes } from "discord-api-types/v10";
import { Message } from "../Message.js";
import { BaseInteraction } from "./BaseInteraction.js";

export class MessageComponentInteraction extends BaseInteraction {
    public getRawMessage(): Message | null {
        return "message" in this.data && this.data.message ? new Message(this.data.message, this.client) : null;
    }

    public get componentType(): ComponentType | null {
        return this.data.data && "component_type" in this.data.data ? this.data.data.component_type : null;
    }

    public get customId(): string | null {
        return this.data.data && "custom_id" in this.data.data ? this.data.data.custom_id : null;
    }

    public get values(): string[] {
        return this.data.data && "values" in this.data.data ? this.data.data.values : [];
    }

    public async deferUpdate(): Promise<void> {
        await this.client.rest.post(Routes.interactionCallback(this.id, this.data.token), {
            body: {
                type: InteractionResponseType.DeferredMessageUpdate
            },
            auth: false
        });
        this.deferred = true;
    }

    public async update(options: APIInteractionResponseCallbackData): Promise<Message> {
        if (this.deferred && this.replied) return Promise.reject(new Error("This interaction has already been deferred or replied."));
        const message = await this.client.rest.patch(Routes.interactionCallback(this.applicationId, this.data.token), {
            body: {
                type: InteractionResponseType.UpdateMessage,
                data: options
            },
            auth: false
        });
        this.replied = true;
        return new Message(message as APIMessage, this.client);
    }
}
