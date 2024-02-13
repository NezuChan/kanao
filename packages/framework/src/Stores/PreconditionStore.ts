import type { BaseContextMenuInteraction, BaseInteraction, CommandInteraction, Message } from "@nezuchan/core";
import { Store } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import type { CommandContext } from "../Lib/CommandContext.js";
import { Identifiers } from "../Utilities/Errors/Identifiers.js";
import type { UserError } from "../Utilities/Errors/UserError.js";
import type { Command } from "./Command.js";
import type { InteractionHandler } from "./InteractionHandler.js";
import { Precondition } from "./Precondition.js";
import type { PreconditionContext } from "./Precondition.js";

export class PreconditionStore extends Store<Precondition> {
    private readonly globalPreconditions: Precondition[] = [];

    public constructor() {
        super(Precondition, { name: "preconditions" });
    }

    public async messageRun(message: Message, command: Command, context: PreconditionContext = {}): Promise<Result<unknown, UserError>> {
        for (const precondition of this.globalPreconditions) {
            const result = precondition.messageRun
                ? await precondition.messageRun(message, command, context)
                : await precondition.error({
                    identifier: Identifiers.PreconditionMissingMessageHandler,
                    message: `The precondition "${precondition.name}" is missing a "messageRun" handler, but it was requested for the "${command.name}" command.`
				  });

            if (result.isErr()) {
                return result;
            }
        }

        return Result.ok();
    }

    public async chatInputRun(
        interaction: CommandInteraction,
        command: Command,
        context: PreconditionContext = {}
    ): Promise<Result<unknown, UserError>> {
        for (const precondition of this.globalPreconditions) {
            const result = precondition.chatInputRun
                ? await precondition.chatInputRun(interaction, command, context)
                : await precondition.error({
                    identifier: Identifiers.PreconditionMissingChatInputHandler,
                    message: `The precondition "${precondition.name}" is missing a "chatInputRun" handler, but it was requested for the "${command.name}" command.`
				  });

            if (result.isErr()) {
                return result;
            }
        }

        return Result.ok();
    }

    public async contextMenuRun(
        interaction: BaseContextMenuInteraction,
        command: Command,
        context: PreconditionContext = {}
    ): Promise<Result<unknown, UserError>> {
        for (const precondition of this.globalPreconditions) {
            const result = precondition.contextMenuRun
                ? await precondition.contextMenuRun(interaction, command, context)
                : await precondition.error({
                    identifier: Identifiers.PreconditionMissingContextMenuHandler,
                    message: `The precondition "${precondition.name}" is missing a "contextMenuRun" handler, but it was requested for the "${command.name}" command.`
				  });

            if (result.isErr()) {
                return result;
            }
        }

        return Result.ok();
    }

    public async contextRun(
        ctx: CommandContext,
        command: Command,
        context: PreconditionContext = {}
    ): Promise<Result<unknown, UserError>> {
        for (const precondition of this.globalPreconditions) {
            const result = precondition.contextRun
                ? await precondition.contextRun(ctx, command, context)
                : await precondition.error({
                    identifier: Identifiers.PreconditionMissingContextMenuHandler,
                    message: `The precondition "${precondition.name}" is missing a "contextRun" handler, but it was requested for the "${command.name}" command.`
				  });

            if (result.isErr()) {
                return result;
            }
        }

        return Result.ok();
    }

    public async interactionHandlerRun(
        interaction: BaseInteraction,
        handler: InteractionHandler,
        context: PreconditionContext = {}
    ): Promise<Result<unknown, UserError>> {
        for (const precondition of this.globalPreconditions) {
            const result = precondition.interactionHandlerRun
                ? await precondition.interactionHandlerRun(interaction, handler, context)
                : await precondition.error({
                    identifier: Identifiers.PreconditionMissingInteractionHandler,
                    message: `The precondition "${precondition.name}" is missing a "interactionHandlerRun" handler, but it was requested for the "${handler.name}" handler.`
				  });

            if (result.isErr()) {
                return result;
            }
        }

        return Result.ok();
    }

    public override set(key: string, value: Precondition): this {
        if (value.position !== null) {
            const index = this.globalPreconditions.findIndex(precondition => precondition.position! >= value.position!);

            if (index === -1) this.globalPreconditions.push(value);
            else this.globalPreconditions.splice(index, 0, value);
        }

        return super.set(key, value);
    }

    public override delete(key: string): boolean {
        const index = this.globalPreconditions.findIndex(precondition => precondition.name === key);

        if (index !== -1) this.globalPreconditions.splice(index, 1);

        return super.delete(key);
    }

    public override clear(): void {
        this.globalPreconditions.length = 0;
        super.clear();
    }
}
