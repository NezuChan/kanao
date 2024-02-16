import type { BaseContextMenuInteraction, BaseInteraction, CommandInteraction, Message, PermissionsBitField } from "@nezuchan/core";
import type { LoaderPieceContext, PieceOptions } from "@sapphire/pieces";
import { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import type { Awaitable } from "@sapphire/utilities";
import type { CommandContext } from "../Lib/CommandContext.js";
import { PreconditionError } from "../Utilities/Errors/PreconditionError.js";
import type { UserError } from "../Utilities/Errors/UserError.js";
import type { Command } from "./Command.js";
import type { InteractionHandler } from "./InteractionHandler.js";

export class Precondition extends Piece {
    public readonly position: number | null;

    public constructor(context: LoaderPieceContext, options: PreconditionOptions) {
        super(context, options);
        this.position = options.position ?? null;
    }

    public chatInputRun?(interaction: CommandInteraction, command: Command, context?: PreconditionContext): Awaitable<Result<unknown, UserError>>;
    public contextMenuRun?(interaction: BaseContextMenuInteraction, command: Command, context?: PreconditionContext): Awaitable<Result<unknown, UserError>>;
    public messageRun?(message: Message, command: Command, context?: PreconditionContext): Awaitable<Result<unknown, UserError>>;

    public contextRun?(ctx: CommandContext, command: Command, context?: PreconditionContext): Awaitable<Result<unknown, UserError>>;
    public interactionHandlerRun?(interaction: BaseInteraction, handler: InteractionHandler, context?: PreconditionContext): Awaitable<Result<unknown, UserError>>;

    public error(options: Omit<PreconditionError.Options, "precondition"> = {}): Awaitable<Result<unknown, UserError>> {
        return Result.err(new PreconditionError({ precondition: this, ...options }));
    }

    public ok(): Awaitable<Result<unknown, UserError>> {
        return Result.ok();
    }
}

export type PreconditionOptions = PieceOptions & {
    position?: number;
};

export interface Preconditions {
    Enabled: never;
    ClientVoicePermissions: {
        permissions: PermissionsBitField;
    };
    ClientTextPermissions: {
        permissions: PermissionsBitField;
    };
    UserPermissions: {
        permissions: PermissionsBitField;
    };
}

export type PreconditionContext = Record<PropertyKey, unknown> & {
    external?: boolean;
};

export type PreconditionKeys = keyof Preconditions;
export type SimplePreconditionKeys = {
    [K in PreconditionKeys]: Preconditions[K] extends never ? K : never;
}[PreconditionKeys];
