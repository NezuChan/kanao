/* eslint-disable unicorn/no-nested-ternary */

import type { EventEmitter } from "node:events";
import type { LoaderPieceContext, PieceOptions } from "@sapphire/pieces";
import { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import type { Logger } from "pino";
import type { ListenerStore } from "./ListenerStore.js";

export type ListenerContext = LoaderPieceContext & {
    store: ListenerStore;
};

export abstract class Listener extends Piece {
    public store: ListenerStore;
    public emitter: EventEmitter | null;
    public logger: Logger;
    public event: string | symbol;
    public once: boolean;
    private _listener: ((...args: any[]) => void) | null;

    public constructor(context: ListenerContext, options: ListenerOptions = {}) {
        super(context, options);

        this.store = context.store;

        this.emitter = this.container.client;
        this.logger = this.container.client.logger;

        this.event = options.event ?? this.name;
        this.once = options.once ?? false;

        this._listener = this.event ? this.once ? this._runOnce.bind(this) : this._run.bind(this) : null;

        if (this._listener === null) this.enabled = false;
    }

    public override onLoad(): unknown {
        if (this._listener) {
            const emitter = this.emitter!;

            const maxListeners = emitter.getMaxListeners();
            if (maxListeners !== 0) emitter.setMaxListeners(maxListeners + 1);

            emitter[this.once ? "once" : "on"](this.event, this._listener);
        }
        return super.onLoad();
    }

    public override onUnload(): unknown {
        if (!this.once && this._listener) {
            const emitter = this.emitter!;

            const maxListeners = emitter.getMaxListeners();
            if (maxListeners !== 0) emitter.setMaxListeners(maxListeners - 1);

            emitter.off(this.event, this._listener);
            this._listener = null;
        }

        return super.onUnload();
    }

    private async _run(...args: unknown[]): Promise<void> {
        const result = await Result.fromAsync(() => this.run(...args));
        if (result.isErr()) this.logger.error(result.unwrapErr(), this.name);
    }

    private async _runOnce(...args: unknown[]): Promise<void> {
        await this._run(...args);
        await this.unload();
    }

    public abstract run(...args: unknown[]): unknown;
}

export type ListenerOptions = PieceOptions & {
    event?: string | symbol;
    once?: boolean;
};
