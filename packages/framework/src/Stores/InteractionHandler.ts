/* eslint-disable class-methods-use-this */
import { BaseInteraction, PermissionsBitField } from "@nezuchan/core";
import { Piece } from "@sapphire/pieces";
import { Option } from "@sapphire/result";
import { Awaitable } from "@sapphire/utilities";
import { PreconditionContainerArray, PreconditionEntryResolvable } from "../Lib/Preconditions/PreconditionContainerArray.js";
import { PermissionFlagsBits } from "discord-api-types/v10";

export abstract class InteractionHandler<O extends InteractionHandlerOptions = InteractionHandlerOptions> extends Piece<O> {
    public preconditions: PreconditionContainerArray;
    public constructor(context: Piece.Context, options: InteractionHandlerOptions) {
        super(context, options);
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

        const userPermissions = new PermissionsBitField(PermissionFlagsBits, options.userPermissions ?? 0n);

        if (userPermissions.bits !== 0n) {
            this.preconditions.append({
                name: "UserPermissions",
                context: {
                    permissions: userPermissions
                }
            });
        }
    }

    public parse(_interaction: BaseInteraction): Awaitable<Option<unknown>> {
        return this.some();
    }

    public some(): Option.Some<never>;
    public some<T>(data: T): Option.Some<T>;
    public some<T>(data?: T): Option.Some<T | undefined> {
        return Option.some(data);
    }

    public none(): Option.None {
        return Option.none;
    }

    public abstract run(interaction: BaseInteraction, parsedData?: unknown): unknown;
}

export interface InteractionHandlerOptions extends Piece.Options {
    preconditions?: PreconditionEntryResolvable[];
    clientPermissions?: {
        voice?: bigint[];
        text?: bigint[];
    };
    userPermissions?: bigint[];
    readonly interactionHandlerType: InteractionHandlerTypes;
}

export enum InteractionHandlerTypes {
    Button = 0,
    SelectMenu = 1,
    ModalSubmit = 2,
    MessageComponent = 3,
    Autocomplete = 4
}
