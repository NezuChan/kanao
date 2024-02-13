/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Result, err } from "@sapphire/result";
import { UserError } from "../../Utilities/Errors/UserError.js";
import { IPreconditionContainer } from "./IPreconditionContainer.js";
import { BaseContextMenuInteraction, BaseInteraction, CommandInteraction, Message } from "@nezuchan/core";
import { Command } from "../../Stores/Command.js";
import { container } from "@sapphire/pieces";
import { PreconditionContext, PreconditionKeys, Preconditions, SimplePreconditionKeys } from "../../Stores/Precondition.js";
import { CommandContext } from "../CommandContext.js";
import { Awaitable } from "@sapphire/utilities";
import { Identifiers } from "../../Utilities/Errors/Identifiers.js";
import { InteractionHandler } from "../../Stores/InteractionHandler.js";

export interface SimplePreconditionSingleResolvableDetails {
    name: SimplePreconditionKeys;
}

export interface PreconditionSingleResolvableDetails<K extends PreconditionKeys = PreconditionKeys> {
    name: K;
    context: Preconditions[K];
}

export type PreconditionSingleResolvable = PreconditionSingleResolvableDetails | SimplePreconditionKeys | SimplePreconditionSingleResolvableDetails;

export class PreconditionContainerSingle implements IPreconditionContainer {
    public readonly context: Record<PropertyKey, unknown>;
    public readonly name: string;

    public constructor(data: PreconditionSingleResolvable) {
        if (typeof data === "string") {
            this.name = data;
            this.context = {};
        } else {
            this.context = Reflect.get(data, "context") ?? {};
            this.name = data.name;
        }
    }

    public messageRun(message: Message, command: Command, context?: PreconditionContext | undefined): Awaitable<Result<unknown, UserError>> {
        const precondition = container.stores.get("preconditions").get(this.name);
        if (precondition) {
            return precondition.messageRun
                ? precondition.messageRun(message, command, { ...context, ...this.context })
                : precondition.error({
                    identifier: Identifiers.PreconditionMissingMessageHandler,
                    message: `The precondition "${precondition.name}" is missing a "messageRun" handler, but it was requested for the "${command.name}" command.`
				  });
        }
        return err(new UserError({ identifier: Identifiers.PreconditionUnavailable, message: `The precondition "${this.name}" is not available.` }));
    }

    public chatInputRun(interaction: CommandInteraction, command: Command, context?: PreconditionContext | undefined): Awaitable<Result<unknown, UserError>> {
        const precondition = container.stores.get("preconditions").get(this.name);
        if (precondition) {
            return precondition.chatInputRun
                ? precondition.chatInputRun(interaction, command, { ...context, ...this.context })
                : precondition.error({
                    identifier: Identifiers.PreconditionMissingChatInputHandler,
                    message: `The precondition "${precondition.name}" is missing a "chatInputRun" handler, but it was requested for the "${command.name}" command.`
				  });
        }
        return err(new UserError({ identifier: Identifiers.PreconditionUnavailable, message: `The precondition "${this.name}" is not available.` }));
    }

    public contextMenuRun(interaction: BaseContextMenuInteraction, command: Command, context?: PreconditionContext | undefined): Awaitable<Result<unknown, UserError>> {
        const precondition = container.stores.get("preconditions").get(this.name);
        if (precondition) {
            return precondition.contextMenuRun
                ? precondition.contextMenuRun(interaction, command, { ...context, ...this.context })
                : precondition.error({
                    identifier: Identifiers.PreconditionMissingContextMenuHandler,
                    message: `The precondition "${precondition.name}" is missing a "contextMenuRun" handler, but it was requested for the "${command.name}" command.`
				  });
        }
        return err(new UserError({ identifier: Identifiers.PreconditionUnavailable, message: `The precondition "${this.name}" is not available.` }));
    }

    public contextRun(ctx: CommandContext, command: Command, context?: PreconditionContext | undefined): Awaitable<Result<unknown, UserError>> {
        const precondition = container.stores.get("preconditions").get(this.name);
        if (precondition) {
            return precondition.contextRun
                ? precondition.contextRun(ctx, command, { ...context, ...this.context })
                : precondition.error({
                    identifier: Identifiers.PreconditionMissingContextHandler,
                    message: `The precondition "${precondition.name}" is missing a "contextRun" handler, but it was requested for the "${command.name}" command.`
				  });
        }
        return err(new UserError({ identifier: Identifiers.PreconditionUnavailable, message: `The precondition "${this.name}" is not available.` }));
    }

    public interactionHandlerRun(interaction: BaseInteraction, handler: InteractionHandler, context?: PreconditionContext | undefined): Awaitable<Result<unknown, UserError>> {
        const precondition = container.stores.get("preconditions").get(this.name);
        if (precondition) {
            return precondition.interactionHandlerRun
                ? precondition.interactionHandlerRun(interaction, handler, { ...context, ...this.context })
                : precondition.error({
                    identifier: Identifiers.PreconditionMissingInteractionHandler,
                    message: `The precondition "${precondition.name}" is missing a "PreconditionMissingInteractionHandler" handler, but it was requested for the "${handler.name}" handler.`
				  });
        }
        return err(new UserError({ identifier: Identifiers.PreconditionUnavailable, message: `The precondition "${this.name}" is not available.` }));
    }
}
