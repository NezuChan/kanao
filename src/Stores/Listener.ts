/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { WebSocketManager } from "@discordjs/ws";
import { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import { cast } from "@sapphire/utilities";
import { AsyncEventEmitter } from "@vladfrangu/async_event_emitter";
import EventEmitter from "node:events";
import { Logger } from "pino";
import { CommonEvents } from "../Utilities/Enums/CommonEvents.js";

export abstract class Listener extends Piece {
    public readonly emitter: AsyncEventEmitter | EventEmitter | WebSocketManager | null;
    public readonly event: string | symbol;
    public readonly once: boolean;
    public readonly logger: Logger;
    private _listener: ((...args: any[]) => void) | null;

    public constructor(context: Piece.Context, public options: ListenerOptions) {
        super(context, options);
        this.logger = this.container.gateway.logger;
        this.emitter =
			typeof options.emitter === "undefined"
			    ? this.container.gateway
			    : (typeof options.emitter === "string" ? (Reflect.get(this.container.gateway, options.emitter) as EventEmitter) : options.emitter) ??
				  null;
        this.event = options.event ?? this.name;
        this.once = options.once ?? false;

        this._listener = this.emitter && this.event ? this.once ? this._runOnce.bind(this) : this._run.bind(this) : null;

        if (this.emitter === null || this._listener === null) this.enabled = false;
    }

    public onLoad(): unknown {
        if (this._listener) {
            const emitter = this.emitter!;

            const maxListeners = emitter.getMaxListeners();
            if (maxListeners !== 0) emitter.setMaxListeners(maxListeners + 1);

            cast<EventEmitter>(emitter)[this.once ? "once" : "on"](this.event, this._listener);
        }
        return super.onLoad();
    }

    public onUnload(): unknown {
        if (!this.once && this._listener) {
            const emitter = this.emitter!;

            const maxListeners = emitter.getMaxListeners();
            if (maxListeners !== 0) emitter.setMaxListeners(maxListeners - 1);

            cast<EventEmitter>(emitter).off(this.event, this._listener);
            this._listener = null;
        }

        return super.onUnload();
    }

    private async _run(...args: unknown[]): Promise<void> {
        const result = await Result.fromAsync(() => this.run(...args));
        if (result.isErr()) {
            this.container.gateway.emit(CommonEvents.ListenerError, result.unwrapErr(), { piece: this });
        }
    }

    private async _runOnce(...args: unknown[]): Promise<void> {
        await this._run(...args);
        await this.unload();
    }

    public abstract run(...args: unknown[]): unknown;
}

export interface ListenerOptions extends Piece.Options {
    once?: boolean;
    event?: string | symbol;
    emitter?: AsyncEventEmitter | EventEmitter | WebSocketManager | string | null;
}
