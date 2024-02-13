import type { AutoCompleteInteraction } from "@nezuchan/core";
import type { Piece } from "@sapphire/pieces";
import { Listener } from "../../Stores/Listener.js";
import { Events } from "../../Utilities/EventEnums.js";

export class PossibleAutoCompleteInteraction extends Listener {
    public constructor(context: Piece.LoaderContext) {
        super(context, {
            name: Events.PossibleAutocompleteInteraction
        });
    }

    public async run(interaction: AutoCompleteInteraction): Promise<void> {
        const commandStore = this.container.stores.get("commands");
        if (!interaction.commandName) return;

        const command = commandStore.get(interaction.commandName);

        if (command?.autoCompleteRun) {
            try {
                await command.autoCompleteRun(interaction);
                this.container.client.emit(Events.CommandAutocompleteInteractionSuccess, {
                    command,
                    interaction
                });
            } catch (error) {
                this.container.client.emit(Events.CommandAutocompleteInteractionError, error, {
                    command,
                    interaction
                });
            }
        }

        await this.container.client.stores.get("interaction-handlers").run(interaction);
    }
}
