import { Collection } from "@discordjs/collection";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { PrehandlerContext, PrehandlerKeys, SimplePrehandlerKeys } from "../../Stores/PreHandler.js";
import type { Route } from "../../Stores/Route.js";
import type { IPrehandlerCondition } from "./Conditions/IPrehandlerCondition.js";
import { PrehandlerConditionAnd } from "./Conditions/PrehandlerConditionAnd.js";
import { PrehandlerConditionOr } from "./Conditions/PrehandlerConditionOr.js";
import type { IPrehandlerContainer, PrehandlerContainerReturn } from "./IPrehandlerContainer.js";
import { PrehandlerContainerSingle } from "./PrehandlerContainerSingle.js";
import type { PrehandlerSingleResolvable, SimplePrehandlerSingleResolvableDetails, PrehandlerSingleResolvableDetails } from "./PrehandlerContainerSingle.js";

export enum PrehandlerRunMode {
    Sequential = 0,
    Parallel = 1
}

export enum PrehandlerRunCondition {
    And = 0,
    Or = 1
}

export type PrehandlerArrayResolvableDetails = {
    entries: readonly PrehandlerEntryResolvable[];
    mode: PrehandlerRunMode;
};

export type PrehandlerArrayResolvable = PrehandlerArrayResolvableDetails | readonly PrehandlerEntryResolvable[];

export type PrehandlerEntryResolvable = PrehandlerArrayResolvable | PrehandlerSingleResolvable;

function isSingle(entry: PrehandlerEntryResolvable): entry is PrehandlerSingleResolvable {
    return typeof entry === "string" || Reflect.has(entry, "name");
}

export class PrehandlerContainerArray implements IPrehandlerContainer {
    public readonly mode: PrehandlerRunMode;

    public readonly entries: IPrehandlerContainer[];

    public readonly runCondition: PrehandlerRunCondition;

    public static readonly conditions = new Collection<PrehandlerRunCondition, IPrehandlerCondition>([
        [PrehandlerRunCondition.And, PrehandlerConditionAnd],
        [PrehandlerRunCondition.Or, PrehandlerConditionOr]
    ]);

    public constructor(data: PrehandlerArrayResolvable = [], parent: PrehandlerContainerArray | null = null) {
        this.entries = [];
        this.runCondition = parent?.runCondition === PrehandlerRunCondition.And ? PrehandlerRunCondition.Or : PrehandlerRunCondition.And;

        if (Array.isArray(data)) {
            const casted = data as readonly PrehandlerEntryResolvable[];

            this.mode = parent?.mode ?? PrehandlerRunMode.Sequential;
            this.parse(casted);
        } else {
            const casted = data as PrehandlerArrayResolvableDetails;

            this.mode = casted.mode;
            this.parse(casted.entries);
        }
    }

    public add(entry: IPrehandlerContainer): this {
        this.entries.push(entry);
        return this;
    }

    public append(keyOrEntries: PrehandlerContainerArray | SimplePrehandlerKeys | SimplePrehandlerSingleResolvableDetails): this;
    public append<K extends PrehandlerKeys>(entry: PrehandlerSingleResolvableDetails<K>): this;
    public append(entry: PrehandlerContainerArray | PrehandlerSingleResolvable): this {
        this.entries.push(entry instanceof PrehandlerContainerArray ? entry : new PrehandlerContainerSingle(entry));
        return this;
    }

    public run(request: FastifyRequest, reply: FastifyReply, route: Route, context?: PrehandlerContext | undefined): PrehandlerContainerReturn {
        return this.mode === PrehandlerRunMode.Sequential
            ? this.condition.runParallel(request, reply, route, this.entries, context)
            : this.condition.runSequential(request, reply, route, this.entries, context);
    }

    protected parse(entries: Iterable<PrehandlerEntryResolvable>): this {
        for (const entry of entries) {
            this.add(
                isSingle(entry)
                    ? new PrehandlerContainerSingle(entry)
                    : new PrehandlerContainerArray(entry, this)
            );
        }

        return this;
    }

    protected get condition(): IPrehandlerCondition {
        return PrehandlerContainerArray.conditions.get(this.runCondition)!;
    }
}
