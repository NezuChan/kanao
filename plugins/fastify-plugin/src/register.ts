import "./index.js";

import middie from "@fastify/middie";
import type { ClientOptions } from "@nezuchan/framework";
import { FrameworkClient, Plugin, postInitialization, postLogin } from "@nezuchan/framework";
import { container } from "@sapphire/pieces";
import fastify from "fastify";
import { PreHandlerStore } from "./Stores/PreHandlerStore.js";
import { RouteStore } from "./Stores/RouteStore.js";

export class Api extends Plugin {
    public static [postInitialization](this: FrameworkClient, options: ClientOptions): void {
        this.server = fastify(options.api);

        this.stores.register(new RouteStore());
        this.stores.register(new PreHandlerStore());
        container.server = this.server;
    }

    public static async [postLogin](this: FrameworkClient): Promise<void> {
        await this.server.register(middie);
        await this.server.listen({ port: this.options.api?.port ?? 3_000, host: this.options.api?.host ?? "localhost" });
    }
}

FrameworkClient.plugins.registerPostInitializationHook(Api[postInitialization], "API-PostInitialization");
FrameworkClient.plugins.registerPostLoginHook(Api[postLogin], "API-PostLogin");
