import type { FastifyInstance, FastifyServerOptions } from "fastify";
import type { PreHandlerStore } from "./Stores/PreHandlerStore.js";
import type { RouteStore } from "./Stores/RouteStore.js";

export * from "./Lib/Prehandlers/PrehandlerContainerArray.js";
export * from "./Lib/Prehandlers/PrehandlerContainerSingle.js";
export * from "./Lib/Prehandlers/IPrehandlerContainer.js";

export * from "./Lib/Prehandlers/Conditions/IPrehandlerCondition.js";
export * from "./Lib/Prehandlers/Conditions/PrehandlerConditionAnd.js";
export * from "./Lib/Prehandlers/Conditions/PrehandlerConditionOr.js";

export * from "./Stores/PreHandler.js";
export * from "./Stores/PreHandlerStore.js";
export * from "./Stores/Route.js";
export * from "./Stores/RouteStore.js";

export * from "./Errors/ApiError.js";

declare module "@nezuchan/core" {
    interface Client {
        server: FastifyInstance;
    }

    interface ClientOptions {
        api?: FastifyServerOptions & { port?: number; host?: string; };
    }
}

declare module "@sapphire/pieces" {
    interface StoreRegistryEntries {
        routes: RouteStore;
        "pre-handlers": PreHandlerStore;
    }

    interface Container {
        server: FastifyInstance;
    }
}
