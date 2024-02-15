import type { BaseContextMenuInteraction } from "@nezuchan/core";
import type { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import type { Command } from "../../../Stores/Command.js";
import { Listener } from "../../../Stores/Listener.js";
import { Events } from "../../../Utilities/EventEnums.js";

export class ContextMenuCommandAccepted extends Listener {
    public constructor(context: Piece.LoaderContext) {
        super(context, {
            name: Events.ContextMenuCommandAccepted
        });
    }

    public async run(payload: { command: Command; interaction: BaseContextMenuInteraction; }): Promise<void> {
        const result = await Result.fromAsync(() => payload.command.contextMenuRun!(payload.interaction));
        result.inspectErr(error => this.container.client.emit(Events.ChatInputCommandError, error, { ...payload }));
    }
}
