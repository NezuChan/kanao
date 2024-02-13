import { Routes, InteractionResponseType } from "discord-api-types/v10";
import { BaseInteraction } from "./BaseInteraction.js";

export class AutoCompleteInteraction extends BaseInteraction {
    public responded = false;

    public get commandName(): string | null {
        return this.data.data && "name" in this.data.data ? this.data.data.name : null;
    }

    public async respond(options: { name: string; value: string }[]): Promise<void> {
        if (this.responded) new Error("This interaction has already been responded to.");
        await this.client.rest.post(Routes.interactionCallback(this.id, this.data.token), {
            body: {
                type: InteractionResponseType.ApplicationCommandAutocompleteResult,
                data: {
                    choices: options
                }
            },
            auth: false
        });
        this.responded = true;
    }
}
