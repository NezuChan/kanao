import type { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import type { CommandContext } from "../../Lib/CommandContext.js";
import type { Command } from "../../Stores/Command.js";
import { Listener } from "../../Stores/Listener.js";
import { Events } from "../../Utilities/EventEnums.js";

export class ContextCommandAccepted extends Listener {
    public constructor(context: Piece.LoaderContext) {
        super(context, {
            name: Events.ContextCommandAccepted
        });
    }

    public async run(payload: { command: Command; context: CommandContext; }): Promise<void> {
        const result = await Result.fromAsync(() => payload.command.contextRun!(payload.context));
        result.inspectErr(error => this.container.client.emit(Events.ContextCommandError, error, { ...payload }));
    }
}
