/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { CommandInteraction } from "@nezuchan/core";
import type { Piece } from "@sapphire/pieces";
import type { Command } from "../../../Stores/Command.js";
import { Listener } from "../../../Stores/Listener.js";
import { Events } from "../../../Utilities/EventEnums.js";

export class PreChatInputCommandRun extends Listener {
    public constructor(context: Piece.LoaderContext) {
        super(context, {
            name: Events.PreChatInputCommandRun
        });
    }

    public async run(payload: { command: Command; interaction: CommandInteraction; }): Promise<void> {
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
