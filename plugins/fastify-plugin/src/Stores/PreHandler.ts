import type { LoaderPieceContext, PieceOptions } from "@sapphire/pieces";
import { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import type { Awaitable } from "@sapphire/utilities";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ApiError } from "../Errors/ApiError.js";
import type { PrehandlerContainerResult } from "../Lib/Prehandlers/IPrehandlerContainer.js";
import type { Route } from "./Route.js";

export abstract class PreHandler extends Piece {
    public readonly position: number | null;

    public constructor(context: LoaderPieceContext, options: PrehandlerOptions) {
        super(context, options);
        this.position = options.position ?? null;
    }

    public error(options: { message: string; statusCode: number; }): Awaitable<Result<unknown, ApiError>> {
        return Result.err(new ApiError(options.message, options.statusCode));
    }

    public ok(): Awaitable<Result<unknown, ApiError>> {
        return Result.ok();
    }

    public abstract run(request: FastifyRequest, reply: FastifyReply, route: Route, context?: PrehandlerContext | undefined): Awaitable<PrehandlerContainerResult>;
}

export interface PrehandlerContext extends Record<PropertyKey, unknown> {
    external?: boolean;
}

export interface PrehandlerOptions extends PieceOptions {
    position?: number;
}

export interface Prehandlers {
    Enabled: never;
}

export type PrehandlerKeys = keyof Prehandlers;
export type SimplePrehandlerKeys = {
    [K in PrehandlerKeys]: Prehandlers[K] extends never ? K : never;
}[PrehandlerKeys];
