/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ClientOptions as OClientOptions } from "@nezuchan/core";
import { Client } from "@nezuchan/core";
import type { Piece, Store } from "@sapphire/pieces";
import { container } from "@sapphire/pieces";

import type { Channel } from "amqplib";
import { PluginHook } from "../Plugins/Hook.js";
import type { Plugin } from "../Plugins/Plugin.js";
import { PluginManager } from "../Plugins/PluginManager.js";
import { CommandStore } from "../Stores/CommandStore.js";
import { InteractionHandlerStore } from "../Stores/InteractionHandlerStore.js";
import { ListenerStore } from "../Stores/ListenerStore.js";
import { PreconditionStore } from "../Stores/PreconditionStore.js";
import { Events } from "../Utilities/EventEnums.js";

export class FrameworkClient extends Client {
    public stores = container.stores;
    public static plugins = new PluginManager();

    public constructor(
        public options: ClientOptions
    ) {
        super(options);

        container.client = this;

        for (const plugin of FrameworkClient.plugins.values(PluginHook.PreGenericsInitialization)) {
            plugin.hook.call(this, options);
            this.emit(Events.PluginLoaded, plugin.type, plugin.name);
        }

        this.stores
            .register(new ListenerStore()
                .registerPath(resolve(dirname(fileURLToPath(import.meta.url)), "..", "Listeners")))
            .register(new CommandStore())
            .register(new PreconditionStore()
                .registerPath(resolve(dirname(fileURLToPath(import.meta.url)), "..", "Preconditions")))
            .register(new InteractionHandlerStore());

        this.stores.registerPath(this.options.baseUserDirectory);

        for (const plugin of FrameworkClient.plugins.values(PluginHook.PostInitialization)) {
            plugin.hook.call(this, options);
            this.emit(Events.PluginLoaded, plugin.type, plugin.name);
        }
    }

    public async connect(): Promise<void> {
        for (const plugin of FrameworkClient.plugins.values(PluginHook.PreLogin)) {
            await plugin.hook.call(this, this.options);
            this.emit(Events.PluginLoaded, plugin.type, plugin.name);
        }

        super.connect();
        await Promise.all([...this.stores.values()].map(async (store: Store<Piece>) => store.loadAll()));
        if (this.options.registerCommands !== undefined) await this.stores.get("commands").postCommands();

        for (const plugin of FrameworkClient.plugins.values(PluginHook.PostLogin)) {
            await plugin.hook.call(this, this.options);
            this.emit(Events.PluginLoaded, plugin.type, plugin.name);
        }
    }

    public async setupAmqp(channel: Channel): Promise<void> {
        for (const plugin of FrameworkClient.plugins.values(PluginHook.PreSetupAmqp)) {
            await plugin.hook.call(this, this.options);
            this.emit(Events.PluginLoaded, plugin.type, plugin.name);
        }

        await super.setupAmqp(channel);

        for (const plugin of FrameworkClient.plugins.values(PluginHook.PostSetupAmqp)) {
            await plugin.hook.call(this, this.options);
            this.emit(Events.PluginLoaded, plugin.type, plugin.name);
        }
    }

    public static use(plugin: typeof Plugin): typeof FrameworkClient {
        this.plugins.use(plugin);
        return this;
    }
}

declare module "@sapphire/pieces" {
    interface Container {
        client: FrameworkClient;
    }

    interface StoreRegistryEntries {
        commands: CommandStore;
        listeners: ListenerStore;
        preconditions: PreconditionStore;
        "interaction-handlers": InteractionHandlerStore;
    }
}

export type ClientOptions = OClientOptions & {
    baseUserDirectory?: string;
    fetchPrefix?(guildId?: string, authorId?: string, channelId?: string | null): Promise<string[] | string>;
    disableMentionPrefix?: boolean;
    regexPrefix?: RegExp;
    caseInsensitivePrefixes?: boolean;
    caseInsensitiveCommands?: boolean;
    registerCommands?: boolean;
};
