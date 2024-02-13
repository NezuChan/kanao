import { BaseContextMenuInteraction } from "@nezuchan/core";
import { Listener } from "../../../Stores/Listener.js";
import { Piece } from "@sapphire/pieces";
import { Events } from "../../../Utilities/EventEnums.js";
import { Command } from "../../../Stores/Command.js";
import { Result } from "@sapphire/result";

export class ContextMenuCommandAccepted extends Listener {
    public constructor(context: Piece.Context) {
        super(context, {
            name: Events.ContextMenuCommandAccepted
        });
    }

    public async run(payload: { command: Command; interaction: BaseContextMenuInteraction }): Promise<void> {
        const result = await Result.fromAsync(() => payload.command.contextMenuRun!(payload.interaction));
        result.inspectErr(error => this.container.client.emit(Events.ChatInputCommandError, error, { ...payload }));
    }
}
