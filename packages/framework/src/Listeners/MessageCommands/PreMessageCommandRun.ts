/* eslint-disable class-methods-use-this */
import { PieceContext } from "@sapphire/pieces";
import { Listener } from "../../Stores/Listener.js";
import { Events } from "../../Utilities/EventEnums.js";
import { Message } from "@nezuchan/core";
import { Command } from "../../Stores/Command.js";
import { Result } from "@sapphire/result";

export class PreMessageCommandRun extends Listener {
    public constructor(context: PieceContext) {
        super(context, {
            name: Events.PreMessageCommandRun
        });
    }

    public async run(payload: { command: Command; message: Message }): Promise<any> {
        const globalResult = await this.container.stores.get("preconditions").messageRun(payload.message, payload.command, payload);
        if (globalResult.isErr()) {
            this.container.client.emit(Events.MessageCommandDenied, globalResult.unwrapErr(), payload);
            return;
        }

        const localResult = await payload.command.preconditions.messageRun(payload.message, payload.command, payload);
        if (localResult.isErr()) {
            this.container.client.emit(Events.MessageCommandDenied, localResult.unwrapErr(), payload);
            return;
        }

        const result = await Result.fromAsync(() => payload.command.messageRun!(payload.message));
        if (result.isOk()) {
            this.container.client.emit(Events.MessageCommandAccepted, payload);
        } else {
            this.container.client.emit(Events.MessageCommandError, result.unwrapErr(), payload);
        }
    }
}
