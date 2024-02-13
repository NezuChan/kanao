import type { CommandInteraction } from "@nezuchan/core";
import type { Piece } from "@sapphire/pieces";
import { Listener } from "../../../Stores/Listener.js";
import { Events } from "../../../Utilities/EventEnums.js";

export class PossibleChatInputCommand extends Listener {
    public constructor(context: Piece.LoaderContext) {
        super(context, {
            name: Events.PossibleChatInputCommand
        });
    }

    public run(interaction: CommandInteraction): void {
        const commandStore = this.container.stores.get("commands");
        if (interaction.commandName === null) return;

        const command = commandStore.get(interaction.commandName);

        if (command?.chatInputRun !== undefined) {
            this.container.client.emit(
                Events.PreChatInputCommandRun, {
                    command,
                    interaction,
                    context: { commandId: interaction.id, commandName: interaction.commandName }
                }
            );
            return;
        }

        if (command?.options.enableChatInputCommand === false) {
            this.container.client.emit(Events.ChatInputCommandDisabled, {
                command,
                interaction,
                context: { commandId: interaction.id, commandName: interaction.commandName }
            });
            return;
        }

        if (command?.contextRun !== undefined) {
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
