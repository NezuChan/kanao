import type { Result } from "@sapphire/result";
import type { Awaitable } from "@sapphire/utilities";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ApiError } from "../../Errors/ApiError.js";
import type { PrehandlerContext } from "../../Stores/PreHandler.js";
import type { Route } from "../../Stores/Route.js";

export type PrehandlerContainerResult = Result<unknown, ApiError>;

export type PrehandlerContainerReturn = Awaitable<PrehandlerContainerResult>;

export type AsyncPrehandlerContainerReturn = Promise<PrehandlerContainerResult>;

export type IPrehandlerContainer = {
    run(request: FastifyRequest, reply: FastifyReply, route: Route, context?: PrehandlerContext | undefined): PrehandlerContainerReturn;
};
