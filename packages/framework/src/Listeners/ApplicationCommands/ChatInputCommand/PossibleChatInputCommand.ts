import { CommandInteraction } from "@nezuchan/core";
import { Listener } from "../../../Stores/Listener.js";
import { Piece } from "@sapphire/pieces";
import { Events } from "../../../Utilities/EventEnums.js";

export class PossibleChatInputCommand extends Listener {
    public constructor(context: Piece.Context) {
        super(context, {
            name: Events.PossibleChatInputCommand
        });
    }

    public run(interaction: CommandInteraction): void {
        const commandStore = this.container.stores.get("commands");
        if (!interaction.commandName) return;

        const command = commandStore.get(interaction.commandName);

        if (command?.chatInputRun) {
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
