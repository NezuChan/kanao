import { once } from "node:events";
import { join, isAbsolute, resolve } from "node:path";
import { ChildProcess, fork } from "node:child_process";
import { Collection } from "@discordjs/collection";
import { GatewaySendPayload } from "discord-api-types/v10";
import { WebSocketManager, WebSocketShardDestroyOptions, WebSocketShardStatus, managerToFetchingStrategyOptions, IShardingStrategy, WorkerShardingStrategyOptions, WorkerData, WorkerSendPayload, WorkerSendPayloadOp, WorkerReceivePayload, WorkerReceivePayloadOp, IIdentifyThrottler } from "@discordjs/ws";
import * as url from "url";
import { clientId, storeLogs, lokiHost } from "../../config.js";
import { createLogger } from "../Logger.js";
import { Result } from "@sapphire/result";

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

/**
* Strategy used to spawn threads in child_process
*/
export class ProcessShardingStrategy implements IShardingStrategy {
    public logger = createLogger("nezu-gateway", clientId, storeLogs, lokiHost);
    private readonly manager: WebSocketManager;

    private readonly options: WorkerShardingStrategyOptions;

    private readonly connectPromises = new Collection<number, () => void>();

    private readonly destroyPromises = new Collection<number, () => void>();

    private readonly fetchStatusPromises = new Collection<number, (status: WebSocketShardStatus) => void>();

    private readonly waitForIdentifyControllers = new Collection<number, AbortController>();

    private throttler?: IIdentifyThrottler;

    #workers: ChildProcess[] = [];

    readonly #workerByShardId = new Collection<number, ChildProcess>();

    public constructor(manager: WebSocketManager, options: WorkerShardingStrategyOptions) {
        this.manager = manager;
        this.options = options;
    }

    /**
    * {@inheritDoc IShardingStrategy.spawn}
    */
    public async spawn(shardIds: number[]) {
        const shardsPerWorker = this.options.shardsPerWorker === "all" ? shardIds.length : this.options.shardsPerWorker;
        const strategyOptions = await managerToFetchingStrategyOptions(this.manager);

        const loops = Math.ceil(shardIds.length / shardsPerWorker);

        for (let idx = 0; idx < loops; idx++) {
            const slice = shardIds.slice(idx * shardsPerWorker, (idx + 1) * shardsPerWorker);
            const workerData: WorkerData & { processId: number } = {
                ...strategyOptions,
                shardIds: slice,
                processId: idx
            };

            await this.setupWorker(workerData);
        }
    }

    /**
    * {@inheritDoc IShardingStrategy.connect}
    */
    public async connect() {
        const promises = [];

        for (const [shardId, worker] of this.#workerByShardId.entries()) {
            const payload = {
                op: WorkerSendPayloadOp.Connect,
                shardId
            } satisfies WorkerSendPayload;

            // eslint-disable-next-line no-promise-executor-return
            const promise = new Promise<void>(resolve => this.connectPromises.set(shardId, resolve));
            try {
                worker.send(payload);
            } catch {
                setTimeout(() => Result.fromAsync(() => worker.send(payload)), 2000);
            }
            await promise;
        }
    }

    /**
    * {@inheritDoc IShardingStrategy.destroy}
    */
    public async destroy(options: Omit<WebSocketShardDestroyOptions, "recover"> = {}) {
        const promises = [];

        for (const [shardId, worker] of this.#workerByShardId.entries()) {
            const payload = {
                op: WorkerSendPayloadOp.Destroy,
                shardId,
                options
            } satisfies WorkerSendPayload;

            promises.push(
                new Promise<void>(resolve => this.destroyPromises.set(shardId, resolve)).then(() => worker.kill())
            );
            try {
                worker.send(payload);
            } catch {
                setTimeout(() => Result.fromAsync(() => worker.send(payload)), 2000);
            }
        }

        this.#workers = [];
        this.#workerByShardId.clear();

        await Promise.all(promises);
    }

    /**
        * {@inheritDoc IShardingStrategy.send}
        */
    public send(shardId: number, data: GatewaySendPayload) {
        const worker = this.#workerByShardId.get(shardId);
        if (!worker) {
            throw new Error(`No worker found for shard ${shardId}`);
        }

        const payload = {
            op: WorkerSendPayloadOp.Send,
            shardId,
            payload: data
        } satisfies WorkerSendPayload;
        try {
            worker.send(payload);
        } catch {
            setTimeout(() => Result.fromAsync(() => worker.send(payload)), 2000);
        }
    }

    /**
        * {@inheritDoc IShardingStrategy.fetchStatus}
        */
    public async fetchStatus() {
        const statuses = new Collection<number, WebSocketShardStatus>();

        for (const [shardId, worker] of this.#workerByShardId.entries()) {
            const nonce = Math.random();
            const payload = {
                op: WorkerSendPayloadOp.FetchStatus,
                shardId,
                nonce
            } satisfies WorkerSendPayload;

            // eslint-disable-next-line no-promise-executor-return
            const promise = new Promise<WebSocketShardStatus>(resolve => this.fetchStatusPromises.set(nonce, resolve));
            try {
                worker.send(payload);
            } catch {
                setTimeout(() => Result.fromAsync(() => worker.send(payload)), 2000);
            }

            const status = await promise;
            statuses.set(shardId, status);
        }

        return statuses;
    }

    private async setupWorker(workerData: WorkerData) {
        const worker = fork(this.resolveWorkerPath(), {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            env: { ...process.env, WORKER_DATA: JSON.stringify(workerData) }
        });

        await once(worker, "spawn");
        // We do this in case the user has any potentially long running code in their worker
        await this.waitForWorkerReady(worker);

        worker
            .on("error", error => {
                this.logger.error({ error, shardIds: workerData.shardIds }, "process emitted error !");
                worker.removeAllListeners();
                this.#workers.splice(this.#workers.indexOf(worker), 1);
                this.restartWorker(workerData);
            })
            .on("messageerror", error => {
                this.logger.error({ error, shardIds: workerData.shardIds }, "process emitted messageerror !");
                worker.removeAllListeners();
                this.#workers.splice(this.#workers.indexOf(worker), 1);
                this.restartWorker(workerData);
            })
            .on("close", (code, signal) => {
                this.logger.error({ code, signal }, "process emitted close !");
                worker.removeAllListeners();
                this.#workers.splice(this.#workers.indexOf(worker), 1);
                this.restartWorker(workerData);
            })
            .on("message", async (payload: WorkerReceivePayload) => this.onMessage(worker, payload));

        this.#workers.push(worker);
        for (const shardId of workerData.shardIds) {
            this.#workerByShardId.set(shardId, worker);
        }
    }

    private restartWorker(workerData: WorkerData) {
        this.setupWorker(workerData).then(() => {
            const worker = this.#workerByShardId.get(workerData.shardIds[0])!;
            for (const shardId of workerData.shardIds) {
                const payload = {
                    op: WorkerSendPayloadOp.Connect,
                    shardId
                } satisfies WorkerSendPayload;
                try {
                    worker.send(payload);
                } catch {
                    setTimeout(() => Result.fromAsync(() => worker.send(payload)), 2000);
                }
            }
        }).catch(error => setTimeout(() => {
            this.logger.error(error, "Error when starting worker !");
            const worker = this.#workerByShardId.get(workerData.shardIds[0])!;
            this.#workers.splice(this.#workers.indexOf(worker), 1);
            this.restartWorker(workerData);
        }, 5_000));
    }

    private resolveWorkerPath(): string {
        const path = this.options.workerPath;

        if (!path) {
            return join(__dirname, "ShardProcess.js");
        }

        if (isAbsolute(path)) {
            return path;
        }

        if ((/^\.\.?[/\\]/).test(path)) {
            return resolve(path);
        }

        try {
            return require.resolve(path);
        } catch {
            return resolve(path);
        }
    }

    // eslint-disable-next-line class-methods-use-this
    private async waitForWorkerReady(worker: ChildProcess): Promise<void> {
        return new Promise(resolve => {
            const handler = (payload: WorkerReceivePayload) => {
                if (payload.op === WorkerReceivePayloadOp.WorkerReady) {
                    resolve();
                    worker.off("message", handler);
                }
            };

            worker.on("message", handler);
        });
    }

    private async onMessage(worker: ChildProcess, payload: WorkerReceivePayload) {
        switch (payload.op) {
            case WorkerReceivePayloadOp.Connected: {
                this.connectPromises.get(payload.shardId)?.();
                this.connectPromises.delete(payload.shardId);
                break;
            }

            case WorkerReceivePayloadOp.Destroyed: {
                this.destroyPromises.get(payload.shardId)?.();
                this.destroyPromises.delete(payload.shardId);
                break;
            }

            case WorkerReceivePayloadOp.Event: {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                this.manager.emit(payload.event, { ...payload.data, shardId: payload.shardId });
                break;
            }

            case WorkerReceivePayloadOp.RetrieveSessionInfo: {
                if (worker.connected) {
                    const session = await this.manager.options.retrieveSessionInfo(payload.shardId);
                    const response: WorkerSendPayload = {
                        op: WorkerSendPayloadOp.SessionInfoResponse,
                        nonce: payload.nonce,
                        session
                    };
                    try {
                        worker.send(response);
                    } catch {
                        setTimeout(() => Result.fromAsync(() => worker.send(response)), 2000);
                    }
                }
                break;
            }

            case WorkerReceivePayloadOp.UpdateSessionInfo: {
                await this.manager.options.updateSessionInfo(payload.shardId, payload.session);
                break;
            }

            case WorkerReceivePayloadOp.WaitForIdentify: {
                const throttler = await this.ensureThrottler();

                try {
                    const controller = new AbortController();
                    this.waitForIdentifyControllers.set(payload.nonce, controller);
                    await throttler.waitForIdentify(payload.shardId, controller.signal);
                } catch {
                    return;
                }

                if (worker.connected) {
                    const response: WorkerSendPayload = {
                        op: WorkerSendPayloadOp.ShardIdentifyResponse,
                        nonce: payload.nonce,
                        ok: true
                    };
                    try {
                        worker.send(response);
                    } catch {
                        setTimeout(() => Result.fromAsync(() => worker.send(response)), 2000);
                    }
                }
                break;
            }

            case WorkerReceivePayloadOp.FetchStatusResponse: {
                this.fetchStatusPromises.get(payload.nonce)?.(payload.status);
                this.fetchStatusPromises.delete(payload.nonce);
                break;
            }

            case WorkerReceivePayloadOp.WorkerReady: {
                break;
            }

            case WorkerReceivePayloadOp.CancelIdentify: {
                this.waitForIdentifyControllers.get(payload.nonce)?.abort();
                this.waitForIdentifyControllers.delete(payload.nonce);

                const response: WorkerSendPayload = {
                    op: WorkerSendPayloadOp.ShardIdentifyResponse,
                    nonce: payload.nonce,
                    ok: false
                };
                try {
                    worker.send(response);
                } catch {
                    setTimeout(() => Result.fromAsync(() => worker.send(response)));
                }

                break;
            }
        }
    }

    private async ensureThrottler(): Promise<IIdentifyThrottler> {
        this.throttler ??= await this.manager.options.buildIdentifyThrottler(this.manager);
        return this.throttler;
    }
}
