import type { FastifyReply, FastifyRequest } from "fastify";
import type { PrehandlerContext } from "../../../Stores/PreHandler.js";
import type { Route } from "../../../Stores/Route.js";
import type { IPrehandlerContainer, PrehandlerContainerReturn } from "../IPrehandlerContainer.js";

export type IPrehandlerCondition = {
    runSequential(
        request: FastifyRequest,
        reply: FastifyReply,
        route: Route,
        entries: readonly IPrehandlerContainer[],
        context?: PrehandlerContext | undefined
    ): PrehandlerContainerReturn;

    runParallel(
        request: FastifyRequest,
        reply: FastifyReply,
        route: Route,
        entries: readonly IPrehandlerContainer[],
        context?: PrehandlerContext | undefined
    ): PrehandlerContainerReturn;
};
