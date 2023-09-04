/* eslint-disable no-nested-ternary */
import { Piece, PieceContext, PieceOptions } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import { EventEmitter } from "node:events";
import { ListenerStore } from "./ListenerStore.js";
import { Logger } from "pino";

export interface ListenerContext extends PieceContext {
    store: ListenerStore;
}

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

        this.emitter = context.store.emitter;
        this.logger = context.store.logger;

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

export interface ListenerOptions extends PieceOptions {
    event?: string | symbol;
    once?: boolean;
}
