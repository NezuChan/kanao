/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";

export abstract class Task extends Piece {
    public interval: NodeJS.Timeout | null = null;
    public constructor(context: Piece.Context, public options: TaskOptions) {
        super(context, { name: options.name, ...options });
    }

    public onLoad(): unknown {
        this.container.logger!.info(`Loaded task ${this.name}, executed every ${this.options.interval}ms`);
        this.interval = setInterval(() => this._run(this.options.data), this.options.interval);
        return super.onLoad();
    }

    public onUnload(): unknown {
        if (this.interval) clearInterval(this.interval);
        return super.onUnload();
    }

    protected async _run(...args: unknown[]): Promise<void> {
        const result = await Result.fromAsync(() => this.run(...args));
        if (result.isErr()) {
            this.container.logger!.error(result.unwrapErr());
        }
    }

    public abstract run(...args: unknown[]): unknown;
}

export interface TaskOptions extends Piece.Options {
    interval: number;
    data: unknown;
}
