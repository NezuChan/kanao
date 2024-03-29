import type { BaseContextMenuInteraction } from "@nezuchan/core";
import type { Piece } from "@sapphire/pieces";
import { Listener } from "../../../Stores/Listener.js";
import { Events } from "../../../Utilities/EventEnums.js";

export class PossibleContextMenuCommand extends Listener {
    public constructor(context: Piece.LoaderContext) {
        super(context, {
            name: Events.PossibleContextMenuCommand
        });
    }

    public run(interaction: BaseContextMenuInteraction): void {
        const commandStore = this.container.stores.get("commands");
        if (!interaction.commandName) return;

        const command = commandStore.get(interaction.commandName);

        if (command?.contextMenuRun) {
            this.container.client.emit(
                Events.PreContextCommandRun, {
                    command,
                    interaction,
                    context: { commandId: interaction.id, commandName: interaction.commandName }
                }
            );
            return;
        }

        if (command?.options.enableContextMenuCommand === false) {
            this.container.client.emit(Events.ContextMenuCommandDisabled, {
                command,
                interaction,
                context: { commandId: interaction.id, commandName: interaction.commandName }
            });
            return;
        }

        if (command?.contextRun) {
            this.container.client.emit(
                Events.PreContextCommandRun, {
                    command,
                    interaction,
                    context: interaction
                }
            );
        }
    }
}
