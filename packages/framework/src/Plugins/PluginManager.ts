/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Awaitable } from "@sapphire/utilities";
import { ClientOptions, FrameworkClient } from "../Lib/FrameworkClient.js";
import { PluginHook } from "./Hook.js";
import { preGenericsInitialization, preInitialization, postInitialization, preLogin, postLogin } from "./Symbols.js";
import { Plugin } from "./Plugin.js";

export type AsyncPluginHooks = PluginHook.PostLogin | PluginHook.PreLogin;
export type FrameworkPluginAsyncHook = (this: FrameworkClient, options: ClientOptions) => Awaitable<unknown>;

export type SyncPluginHooks = Exclude<PluginHook, AsyncPluginHooks>;
export type FrameworkPluginHook = (this: FrameworkClient, options: ClientOptions) => unknown;

export interface FrameworkPluginHookEntry<T = FrameworkPluginAsyncHook | FrameworkPluginHook> {
    hook: T;
    type: PluginHook;
    name?: string;
}

export class PluginManager {
    public readonly registry = new Set<FrameworkPluginHookEntry>();

    public registerHook(hook: FrameworkPluginHook, type: SyncPluginHooks, name?: string): this;
    public registerHook(hook: FrameworkPluginAsyncHook, type: AsyncPluginHooks, name?: string): this;
    public registerHook(hook: FrameworkPluginAsyncHook | FrameworkPluginHook, type: PluginHook, name?: string): this {
        if (typeof hook !== "function") throw new TypeError(`The provided hook ${name ? `(${name}) ` : ""}is not a function`);
        this.registry.add({ hook, type, name });
        return this;
    }

    public registerPreGenericsInitializationHook(hook: FrameworkPluginHook, name?: string): this {
        return this.registerHook(hook, PluginHook.PreGenericsInitialization, name);
    }

    public registerPreInitializationHook(hook: FrameworkPluginHook, name?: string): this {
        return this.registerHook(hook, PluginHook.PreInitialization, name);
    }

    public registerPostInitializationHook(hook: FrameworkPluginHook, name?: string): this {
        return this.registerHook(hook, PluginHook.PostInitialization, name);
    }

    public registerPreLoginHook(hook: FrameworkPluginAsyncHook, name?: string): this {
        return this.registerHook(hook, PluginHook.PreLogin, name);
    }

    public registerPostLoginHook(hook: FrameworkPluginAsyncHook, name?: string): this {
        return this.registerHook(hook, PluginHook.PostLogin, name);
    }

    public use(plugin: typeof Plugin): this {
        const possibleSymbolHooks: [symbol, PluginHook][] = [
            [preGenericsInitialization, PluginHook.PreGenericsInitialization],
            [preInitialization, PluginHook.PreInitialization],
            [postInitialization, PluginHook.PostInitialization],
            [preLogin, PluginHook.PreLogin],
            [postLogin, PluginHook.PostLogin]
        ];
        for (const [hookSymbol, hookType] of possibleSymbolHooks) {
            const hook = Reflect.get(plugin, hookSymbol) as FrameworkPluginAsyncHook | FrameworkPluginHook;
            if (typeof hook !== "function") continue;
            this.registerHook(hook, hookType as any);
        }
        return this;
    }

    public values(): Generator<FrameworkPluginHookEntry, void>;
    public values(hook: SyncPluginHooks): Generator<FrameworkPluginHookEntry<FrameworkPluginHook>, void>;
    public values(hook: AsyncPluginHooks): Generator<FrameworkPluginHookEntry<FrameworkPluginAsyncHook>, void>;
    public * values(hook?: PluginHook): Generator<FrameworkPluginHookEntry, void> {
        for (const plugin of this.registry) {
            if (hook && plugin.type !== hook) continue;
            yield plugin;
        }
    }
}
