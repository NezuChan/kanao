import { container } from "@sapphire/pieces";
import type { Result } from "@sapphire/result";
import { err } from "@sapphire/result";
import type { Awaitable } from "@sapphire/utilities";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ApiError } from "../../Errors/ApiError.js";
import type { PrehandlerContext, PrehandlerKeys, Prehandlers, SimplePrehandlerKeys } from "../../Stores/PreHandler.js";
import type { Route } from "../../Stores/Route.js";
import type { IPrehandlerContainer } from "./IPrehandlerContainer.js";

export type SimplePrehandlerSingleResolvableDetails = {
    name: SimplePrehandlerKeys;
};

export type PrehandlerSingleResolvableDetails<K extends PrehandlerKeys = PrehandlerKeys> = {
    name: K;
    context: Prehandlers[K];
};

export type PrehandlerSingleResolvable = PrehandlerSingleResolvableDetails | SimplePrehandlerKeys | SimplePrehandlerSingleResolvableDetails;

export class PrehandlerContainerSingle implements IPrehandlerContainer {
    public readonly context: Record<PropertyKey, unknown>;
    public readonly name: string;

    public constructor(data: PrehandlerSingleResolvable) {
        if (typeof data === "string") {
            this.name = data;
            this.context = {};
        } else {
            this.context = Reflect.get(data, "context") ?? {};
            this.name = data.name;
        }
    }

    public run(request: FastifyRequest, reply: FastifyReply, route: Route, context?: PrehandlerContext | undefined): Awaitable<Result<unknown, ApiError>> {
        const prehandler = container.stores.get("pre-handlers").get(this.name);
        if (prehandler) {
            return prehandler.run(request, reply, route, { ...context, ...this.context });
        }
        return err(new ApiError(`The prehandler "${this.name}" is not available.`, 500));
    }
}
