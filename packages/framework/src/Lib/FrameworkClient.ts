import { Piece, Store, container } from "@sapphire/pieces";
import { dirname, resolve } from "node:path";
import { Client, ClientOptions as OClientOptions } from "@nezuchan/core";

import { ListenerStore } from "../Stores/ListenerStore.js";
import { CommandStore } from "../Stores/CommandStore.js";
import { PreconditionStore } from "../Stores/PreconditionStore.js";
import { InteractionHandlerStore } from "../Stores/InteractionHandlerStore.js";
import { fileURLToPath } from "node:url";
import { PluginManager } from "../Plugins/PluginManager.js";
import { Plugin } from "../Plugins/Plugin.js";
import { PluginHook } from "../Plugins/Hook.js";
import { Events } from "../Utilities/EventEnums.js";
import { Channel } from "amqplib";

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
        await Promise.all([...this.stores.values()].map((store: Store<Piece>) => store.loadAll()));
        if (this.options.registerCommands) await this.stores.get("commands").postCommands();

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

export interface ClientOptions extends OClientOptions {
    baseUserDirectory?: string;
    fetchPrefix?: (guildId?: string, authorId?: string, channelId?: string | null) => Promise<string[] | string>;
    disableMentionPrefix?: boolean;
    regexPrefix?: RegExp;
    caseInsensitivePrefixes?: boolean;
    caseInsensitiveCommands?: boolean;
    registerCommands?: boolean;
}
