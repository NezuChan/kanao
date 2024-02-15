import type { BaseContextMenuInteraction, BaseInteraction, CommandInteraction, Message } from "@nezuchan/core";
import type { Command } from "../../../Stores/Command.js";
import type { InteractionHandler } from "../../../Stores/InteractionHandler.js";
import type { PreconditionContext } from "../../../Stores/Precondition.js";
import type { CommandContext } from "../../CommandContext.js";
import type { IPreconditionContainer, PreconditionContainerReturn } from "../IPreconditionContainer.js";

export type IPreconditionCondition = {
    messageSequential(
        message: Message,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;

    messageParallel(
        message: Message,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;

    chatInputSequential(
        interaction: CommandInteraction,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;

    chatInputParallel(
        interaction: CommandInteraction,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;

    contextMenuSequential(
        interaction: BaseContextMenuInteraction,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;

    contextMenuParallel(
        interaction: BaseContextMenuInteraction,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;

    contextCommandSequential(
        ctx: CommandContext,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;

    contextCommandParallel(
        ctx: CommandContext,
        command: Command,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;

    interactionHandlerSequential(
        interaction: BaseInteraction,
        handler: InteractionHandler,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;

    interactionHandlerParallel(
        interaction: BaseInteraction,
        handler: InteractionHandler,
        entries: readonly IPreconditionContainer[],
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn;
};
