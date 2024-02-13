/* eslint-disable class-methods-use-this */

import { AutoCompleteInteraction, BaseContextMenuInteraction, CommandInteraction, Message, PermissionsBitField } from "@nezuchan/core";
import { AliasPiece, AliasPieceOptions, PieceContext } from "@sapphire/pieces";
import { Awaitable } from "@sapphire/utilities";
import { Lexer, IUnorderedStrategy, PrefixedStrategy } from "@sapphire/lexure";
import { FlagStrategyOptions } from "../Lib/FlagUnorderedStrategy.js";
import { CommandContext } from "../Lib/CommandContext.js";
import { PreconditionContainerArray, PreconditionEntryResolvable } from "../Lib/Preconditions/PreconditionContainerArray.js";
import { PermissionFlagsBits, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";

export class Command extends AliasPiece<CommandOptions> {
    public lexer: Lexer;
    public fullCategory = this.location.directories;
    public strategy: IUnorderedStrategy;
    public preconditions: PreconditionContainerArray;
    public meta: CommandMeta;

    public get category(): string | null {
        return this.fullCategory.length > 0 ? this.fullCategory[0] : null;
    }

    public get subCategory(): string | null {
        return this.fullCategory.length > 1 ? this.fullCategory[1] : null;
    }

    public get parentCategory(): string | null {
        return this.fullCategory.length > 1 ? this.fullCategory[this.fullCategory.length - 1] : null;
    }

    public constructor(context: PieceContext, options: CommandOptions) {
        super(context, options);

        this.lexer = new Lexer({
            quotes: options.quotes ?? [
                ['"', '"'], // Double quotes
                ["“", "”"], // Fancy quotes (on iOS)
                ["「", "」"], // Corner brackets (CJK)
                ["«", "»"] // French quotes (guillemets)
            ]
        });

        this.meta = options.meta ?? {};
        this.strategy = options.strategy ?? new PrefixedStrategy(["--", "/"], ["=", ":"]);
        this.preconditions = new PreconditionContainerArray(options.preconditions);

        const clientTextPermissions = new PermissionsBitField(PermissionFlagsBits, options.clientPermissions?.text ?? 0n);

        if (clientTextPermissions.bits !== 0n) {
            this.preconditions.append({
                name: "ClientTextPermissions",
                context: {
                    permissions: clientTextPermissions
                }
            });
        }

        const clientVoicePermissions = new PermissionsBitField(PermissionFlagsBits, options.clientPermissions?.voice ?? 0n);

        if (clientVoicePermissions.bits !== 0n) {
            this.preconditions.append({
                name: "ClientVoicePermissions",
                context: {
                    permissions: clientVoicePermissions
                }
            });
        }

        const UserPermissions = new PermissionsBitField(PermissionFlagsBits, options.userPermissions ?? 0n);

        if (UserPermissions.bits !== 0n) {
            this.preconditions.append({
                name: "UserPermissions",
                context: {
                    permissions: UserPermissions
                }
            });
        }
    }

    public chatInputRun?(interaction: CommandInteraction): Awaitable<unknown>;
    public contextMenuRun?(interaction: BaseContextMenuInteraction): Awaitable<unknown>;
    public messageRun?(message: Message): Awaitable<unknown>;
    public autoCompleteRun?(interaction: AutoCompleteInteraction): Awaitable<unknown>;

    public contextRun?(ctx: CommandContext): Awaitable<unknown>;
}

export interface CommandOptions extends AliasPieceOptions, FlagStrategyOptions {
    quotes?: [string, string][];
    strategy?: IUnorderedStrategy;
    preconditions?: PreconditionEntryResolvable[];
    chatInput?: RESTPostAPIApplicationCommandsJSONBody;
    contextMenu?: RESTPostAPIApplicationCommandsJSONBody;
    meta?: CommandMeta;
    clientPermissions?: {
        voice?: bigint[];
        text?: bigint[];
    };
    userPermissions?: bigint[];
    /**
    * @description If chat input command is enabled on command context.
    */
    enableChatInputCommand?: boolean;
    /**
    * @description If context menu command is enabled on command context.
    */
    enableContextMenuCommand?: boolean;
    /**
    * @description If message command is enabled on command context.
    */
    enableMessageCommand?: boolean;
}

export interface CommandMeta {
    description?: string;
}
