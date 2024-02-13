import { Listener } from "../../Stores/Listener.js";
import { Piece } from "@sapphire/pieces";
import { Events } from "../../Utilities/EventEnums.js";
import { Command } from "../../Stores/Command.js";
import { Result } from "@sapphire/result";
import { CommandContext } from "../../Lib/CommandContext.js";

export class ContextCommandAccepted extends Listener {
    public constructor(context: Piece.Context) {
        super(context, {
            name: Events.ContextCommandAccepted
        });
    }

    public async run(payload: { command: Command; context: CommandContext }): Promise<void> {
        const result = await Result.fromAsync(() => payload.command.contextRun!(payload.context));
        result.inspectErr(error => this.container.client.emit(Events.ContextCommandError, error, { ...payload }));
    }
}
