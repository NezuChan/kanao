import type { BaseContextMenuInteraction, BaseInteraction, CommandInteraction, Message } from "@nezuchan/core";
import type { Result } from "@sapphire/result";
import type { Awaitable } from "@sapphire/utilities";
import type { Command } from "../../Stores/Command.js";
import type { InteractionHandler } from "../../Stores/InteractionHandler.js";
import type { PreconditionContext } from "../../Stores/Precondition.js";
import type { UserError } from "../../Utilities/Errors/UserError.js";
import type { CommandContext } from "../CommandContext.js";

export type PreconditionContainerResult = Result<unknown, UserError>;

export type PreconditionContainerReturn = Awaitable<PreconditionContainerResult>;

export type AsyncPreconditionContainerReturn = Promise<PreconditionContainerResult>;

export type IPreconditionContainer = {
    messageRun(message: Message, command: Command, context?: PreconditionContext): PreconditionContainerReturn;
    chatInputRun(interaction: CommandInteraction, command: Command, context?: PreconditionContext): PreconditionContainerReturn;
    contextMenuRun(interaction: BaseContextMenuInteraction, command: Command, context?: PreconditionContext): PreconditionContainerReturn;
    contextRun(ctx: CommandContext, command: Command, context?: PreconditionContext): PreconditionContainerReturn;

    interactionHandlerRun(interaction: BaseInteraction, handler: InteractionHandler, context?: PreconditionContext): PreconditionContainerReturn;
};
