import { BaseContextMenuInteraction, BaseInteraction, CommandInteraction, Message } from "@nezuchan/core";
import { IPreconditionContainer, PreconditionContainerReturn } from "./IPreconditionContainer.js";
import { Command } from "../../Stores/Command.js";
import { Collection } from "@discordjs/collection";
import { IPreconditionCondition } from "./Conditions/IPreconditionCondition.js";
import { PreconditionConditionAnd } from "./Conditions/PreconditionConditionAnd.js";
import { PreconditionConditionOr } from "./Conditions/PreconditionConditionOr.js";
import { SimplePreconditionKeys, PreconditionKeys, PreconditionContext } from "../../Stores/Precondition.js";
import { PreconditionContainerSingle, PreconditionSingleResolvable, PreconditionSingleResolvableDetails, SimplePreconditionSingleResolvableDetails } from "./PreconditionContainerSingle.js";
import { CommandContext } from "../CommandContext.js";
import { InteractionHandler } from "../../Stores/InteractionHandler.js";

export enum PreconditionRunMode {
    Sequential = 0,
    Parallel = 1
}

export enum PreconditionRunCondition {
    And = 0,
    Or = 1
}

export interface PreconditionArrayResolvableDetails {
    entries: readonly PreconditionEntryResolvable[];
    mode: PreconditionRunMode;
}

export type PreconditionArrayResolvable = PreconditionArrayResolvableDetails | readonly PreconditionEntryResolvable[];

export type PreconditionEntryResolvable = PreconditionArrayResolvable | PreconditionSingleResolvable;

function isSingle(entry: PreconditionEntryResolvable): entry is PreconditionSingleResolvable {
    return typeof entry === "string" || Reflect.has(entry, "name");
}

export class PreconditionContainerArray implements IPreconditionContainer {
    public readonly mode: PreconditionRunMode;

    public readonly entries: IPreconditionContainer[];

    public readonly runCondition: PreconditionRunCondition;

    public static readonly conditions = new Collection<PreconditionRunCondition, IPreconditionCondition>([
        [PreconditionRunCondition.And, PreconditionConditionAnd],
        [PreconditionRunCondition.Or, PreconditionConditionOr]
    ]);

    public constructor(data: PreconditionArrayResolvable = [], parent: PreconditionContainerArray | null = null) {
        this.entries = [];
        this.runCondition = parent?.runCondition === PreconditionRunCondition.And ? PreconditionRunCondition.Or : PreconditionRunCondition.And;

        if (Array.isArray(data)) {
            const casted = data as readonly PreconditionEntryResolvable[];

            this.mode = parent?.mode ?? PreconditionRunMode.Sequential;
            this.parse(casted);
        } else {
            const casted = data as PreconditionArrayResolvableDetails;

            this.mode = casted.mode;
            this.parse(casted.entries);
        }
    }

    public add(entry: IPreconditionContainer): this {
        this.entries.push(entry);
        return this;
    }

    public append(keyOrEntries: PreconditionContainerArray | SimplePreconditionKeys | SimplePreconditionSingleResolvableDetails): this;
    public append<K extends PreconditionKeys>(entry: PreconditionSingleResolvableDetails<K>): this;
    public append(entry: PreconditionContainerArray | PreconditionSingleResolvable): this {
        this.entries.push(entry instanceof PreconditionContainerArray ? entry : new PreconditionContainerSingle(entry));
        return this;
    }

    public messageRun(message: Message, command: Command, context?: PreconditionContext | undefined): PreconditionContainerReturn {
        return this.mode === PreconditionRunMode.Sequential
            ? this.condition.messageSequential(message, command, this.entries, context)
            : this.condition.messageParallel(message, command, this.entries, context);
    }

    public chatInputRun(
        interaction: CommandInteraction,
        command: Command,
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn {
        return this.mode === PreconditionRunMode.Sequential
            ? this.condition.chatInputSequential(interaction, command, this.entries, context)
            : this.condition.chatInputParallel(interaction, command, this.entries, context);
    }

    public contextMenuRun(
        interaction: BaseContextMenuInteraction,
        command: Command,
        context?: PreconditionContext | undefined
    ): PreconditionContainerReturn {
        return this.mode === PreconditionRunMode.Sequential
            ? this.condition.contextMenuSequential(interaction, command, this.entries, context)
            : this.condition.contextMenuParallel(interaction, command, this.entries, context);
    }

    public contextRun(ctx: CommandContext, command: Command, context?: PreconditionContext): PreconditionContainerReturn {
        return this.mode === PreconditionRunMode.Sequential
            ? this.condition.contextCommandSequential(ctx, command, this.entries, context)
            : this.condition.contextCommandSequential(ctx, command, this.entries, context);
    }

    public interactionHandlerRun(interaction: BaseInteraction, handler: InteractionHandler, context?: PreconditionContext): PreconditionContainerReturn {
        return this.mode === PreconditionRunMode.Sequential
            ? this.condition.interactionHandlerParallel(interaction, handler, this.entries, context)
            : this.condition.interactionHandlerSequential(interaction, handler, this.entries, context);
    }

    protected parse(entries: Iterable<PreconditionEntryResolvable>): this {
        for (const entry of entries) {
            this.add(
                isSingle(entry)
                    ? new PreconditionContainerSingle(entry)
                    : new PreconditionContainerArray(entry, this)
            );
        }

        return this;
    }

    protected get condition(): IPreconditionCondition {
        return PreconditionContainerArray.conditions.get(this.runCondition)!;
    }
}
