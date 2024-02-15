import type { BaseInteraction } from "@nezuchan/core";
import type { LoaderPieceContext } from "@sapphire/pieces";
import { Listener } from "../Stores/Listener.js";
import { Events } from "../Utilities/EventEnums.js";

export class InteractionCreate extends Listener {
    public constructor(context: LoaderPieceContext) {
        super(context, {
            name: Events.InteractionCreate
        });
    }

    public async run(interaction: BaseInteraction): Promise<void> {
        if (interaction.isCommandInteraction()) {
            this.container.client.emit(Events.PossibleChatInputCommand, interaction);
        } else if (interaction.isContextMenuInteraction()) {
            this.container.client.emit(Events.PossibleContextMenuCommand, interaction);
        } else if (interaction.isAutoCompleteInteraction()) {
            this.container.client.emit(Events.PossibleAutocompleteInteraction, interaction);
        } else if (interaction.isComponentInteraction() || interaction.isModalSubmit()) {
            await this.container.client.stores.get("interaction-handlers").run(interaction);
        }
    }
}
