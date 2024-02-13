/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { CommandInteraction } from "@nezuchan/core";
import { Listener } from "../../../Stores/Listener.js";
import { Piece } from "@sapphire/pieces";
import { Events } from "../../../Utilities/EventEnums.js";
import { Command } from "../../../Stores/Command.js";

export class PreChatInputCommandRun extends Listener {
    public constructor(context: Piece.Context) {
        super(context, {
            name: Events.PreChatInputCommandRun
        });
    }

    public async run(payload: { command: Command; interaction: CommandInteraction }): Promise<void> {
        const globalResult = await this.container.stores.get("preconditions").chatInputRun(payload.interaction, payload.command, payload as any);
        if (globalResult.isErr()) {
            this.container.client.emit(Events.ChatInputCommandDenied, globalResult.unwrapErr(), payload);
            return;
        }

        const localResult = await payload.command.preconditions.chatInputRun(payload.interaction, payload.command, payload as any);
        if (localResult.isErr()) {
            this.container.client.emit(Events.ChatInputCommandDenied, localResult.unwrapErr(), payload);
            return;
        }
        this.container.client.emit(Events.ChatInputCommandAccepted, payload);
    }
}
