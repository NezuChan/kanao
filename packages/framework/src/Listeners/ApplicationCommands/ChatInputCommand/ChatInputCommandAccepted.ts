import type { CommandInteraction } from "@nezuchan/core";
import type { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import type { Command } from "../../../Stores/Command.js";
import { Listener } from "../../../Stores/Listener.js";
import { Events } from "../../../Utilities/EventEnums.js";

export class ChatInputCommandAccepted extends Listener {
    public constructor(context: Piece.LoaderContext) {
        super(context, {
            name: Events.ChatInputCommandAccepted
        });
    }

    public async run(payload: { command: Command; interaction: CommandInteraction; }): Promise<void> {
        const result = await Result.fromAsync(() => payload.command.chatInputRun!(payload.interaction));
        result.inspectErr(error => this.container.client.emit(Events.ChatInputCommandError, error, { ...payload }));
    }
}
