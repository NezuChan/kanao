/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { BaseContextMenuInteraction } from "@nezuchan/core";
import type { Piece } from "@sapphire/pieces";
import type { Command } from "../../../Stores/Command.js";
import { Listener } from "../../../Stores/Listener.js";
import { Events } from "../../../Utilities/EventEnums.js";

export class PreContextMenuCommandRun extends Listener {
    public constructor(context: Piece.LoaderContext) {
        super(context, {
            name: Events.PreContextMenuCommandRun
        });
    }

    public async run(payload: { command: Command; interaction: BaseContextMenuInteraction; }): Promise<void> {
        const globalResult = await this.container.stores.get("preconditions").contextMenuRun(payload.interaction, payload.command, payload as any);
        if (globalResult.isErr()) {
            this.container.client.emit(Events.ContextMenuCommandDenied, globalResult.unwrapErr(), payload);
            return;
        }

        const localResult = await payload.command.preconditions.contextMenuRun(payload.interaction, payload.command, payload as any);
        if (localResult.isErr()) {
            this.container.client.emit(Events.ContextMenuCommandDenied, localResult.unwrapErr(), payload);
            return;
        }

        this.container.client.emit(Events.ContextMenuCommandAccepted, payload);
    }
}
