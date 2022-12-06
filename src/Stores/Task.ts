/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";
import { Logger } from "pino";
import { CommonEvents } from "../Utilities/Enums/CommonEvents.js";

export abstract class Task extends Piece {
    public readonly logger: Logger;

    public constructor(context: Piece.Context, public options: TaskOptions) {
        super(context, { name: options.name, ...options });
        this.logger = this.container.gateway.logger;
    }

    public onLoad(): unknown {
        void Result.fromAsync(async () => {
            await this.container.gateway.tasks.sender.post({
                name: this.name,
                options: this.options.taskOptions.options,
                type: "add",
                data: this.options.taskOptions.data
            });
        });
        this.container.gateway.tasks.receiver.on(this.name, this._run.bind(this));
        return super.onLoad();
    }

    public onUnload(): unknown {
        this.container.gateway.tasks.receiver.off(this.name, this._run.bind(this));

        return super.onUnload();
    }

    private async _run(...args: unknown[]): Promise<void> {
        const result = await Result.fromAsync(() => this.run(...args));
        if (result.isErr()) {
            this.container.gateway.emit(CommonEvents.TaskError, result.unwrapErr(), { piece: this });
        }
    }

    public abstract run(...args: unknown[]): unknown;
}

export interface TaskOptions extends Piece.Options {
    taskOptions: { options: JobOptions; name: string; data: unknown };
}

type JobId = number | string;

interface JobOptions {
    /**
     * Optional priority value. ranges from 1 (highest priority) to MAX_INT  (lowest priority).
     * Note that using priorities has a slight impact on performance, so do not use it if not required
     */
    priority?: number | undefined;

    /**
     * An amount of miliseconds to wait until this job can be processed.
     * Note that for accurate delays, both server and clients should have their clocks synchronized. [optional]
     */
    delay?: number | undefined;

    /**
     * The total number of attempts to try the job until it completes
     */
    attempts?: number | undefined;

    /**
     * Repeat job according to a cron specification
     */
    repeat?: CronRepeatOptions | EveryRepeatOptions | undefined;

    /**
     * Backoff setting for automatic retries if the job fails
     */
    backoff?: BackoffOptions | number | undefined;

    /**
     * A boolean which, if true, adds the job to the right
     * of the queue instead of the left (default false)
     */
    lifo?: boolean | undefined;

    /**
     *  The number of milliseconds after which the job should be fail with a timeout error
     */
    timeout?: number | undefined;

    /**
     * Override the job ID - by default, the job ID is a unique
     * integer, but you can use this setting to override it.
     * If you use this option, it is up to you to ensure the
     * jobId is unique. If you attempt to add a job with an id that
     * already exists, it will not be added.
     */
    jobId?: JobId | undefined;

    /**
     * A boolean which, if true, removes the job when it successfully completes.
     * When a number, it specifies the amount of jobs to keep.
     * Default behavior is to keep the job in the completed set.
     * See KeepJobsOptions if using that interface instead.
     */
    removeOnComplete?: KeepJobsOptions | boolean | number | undefined;

    /**
     * A boolean which, if true, removes the job when it fails after all attempts.
     * When a number, it specifies the amount of jobs to keep.
     * Default behavior is to keep the job in the failed set.
     * See KeepJobsOptions if using that interface instead.
     */
    removeOnFail?: KeepJobsOptions | boolean | number | undefined;

    /**
     * Limits the amount of stack trace lines that will be recorded in the stacktrace.
     */
    stackTraceLimit?: number | undefined;

    /**
     * Prevents JSON data from being parsed.
     */
    preventParsingData?: boolean | undefined;
}

interface RepeatOptions {
    /**
     * Timezone
     */
    tz?: string | undefined;

    /**
     * End date when the repeat job should stop repeating
     */
    endDate?: Date | number | string | undefined;

    /**
     * Number of times the job should repeat at max.
     */
    limit?: number | undefined;
}

interface CronRepeatOptions extends RepeatOptions {
    /**
     * Cron pattern specifying when the job should execute
     */
    cron: string;

    /**
     * Start date when the repeat job should start repeating (only with cron).
     */
    startDate?: Date | number | string | undefined;
}

interface EveryRepeatOptions extends RepeatOptions {
    /**
     * Repeat every millis (cron setting cannot be used together with this setting.)
     */
    every: number;
}

interface BackoffOptions {
    /**
     * Backoff type, which can be either `fixed` or `exponential`
     */
    type: string;

    /**
     * Backoff delay, in milliseconds
     */
    delay?: number | undefined;

    /**
     * Options for custom strategies
     */
    strategyOptions?: any;
}

interface KeepJobsOptions {
    /**
     * Maximum age in *seconds* for job to be kept.
     */
    age?: number | undefined;

    /**
     * Maximum count of jobs to be kept.
     */
    count?: number | undefined;
}
