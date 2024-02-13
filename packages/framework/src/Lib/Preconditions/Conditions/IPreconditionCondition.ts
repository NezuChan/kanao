import { BaseContextMenuInteraction, BaseInteraction, CommandInteraction, Message } from "@nezuchan/core";
import { Command } from "../../../Stores/Command.js";
import { CommandContext } from "../../CommandContext.js";
import { IPreconditionContainer, PreconditionContainerReturn } from "../IPreconditionContainer.js";
import { PreconditionContext } from "../../../Stores/Precondition.js";
import { InteractionHandler } from "../../../Stores/InteractionHandler.js";

export interface IPreconditionCondition {
    messageSequential: (
        message: Message,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;

    messageParallel: (
        message: Message,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;

    chatInputSequential: (
        interaction: CommandInteraction,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;

    chatInputParallel: (
        interaction: CommandInteraction,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;

    contextMenuSequential: (
        interaction: BaseContextMenuInteraction,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;

    contextMenuParallel: (
        interaction: BaseContextMenuInteraction,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;

    contextCommandSequential: (
        ctx: CommandContext,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;

    contextCommandParallel: (
        ctx: CommandContext,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;

    interactionHandlerSequential: (
        interaction: BaseInteraction,
        handler: InteractionHandler,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;

    interactionHandlerParallel: (
        interaction: BaseInteraction,
        handler: InteractionHandler,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ) => PreconditionContainerReturn;
}
