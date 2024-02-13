/* eslint-disable no-promise-executor-return */
import process from "node:process";
import { setTimeout } from "node:timers";
import { Collection } from "@discordjs/collection";
import type { SessionInfo, WorkerReceivePayload, WorkerSendPayload, FetchingStrategyOptions, IContextFetchingStrategy } from "@discordjs/ws";
import { WorkerReceivePayloadOp, WorkerSendPayloadOp } from "@discordjs/ws";
import { Result } from "@sapphire/result";

type PolyFillAbortSignal = {
    readonly aborted: boolean;
    addEventListener(type: "abort", listener: () => void): void;
    removeEventListener(type: "abort", listener: () => void): void;
};

export class ProcessContextFetchingStrategy implements IContextFetchingStrategy {
    private readonly sessionPromises = new Collection<number, (session: SessionInfo | null) => void>();

    private readonly waitForIdentifyPromises = new Collection<number, { reject(): void; resolve(): void; }>();

    public constructor(public readonly options: FetchingStrategyOptions) {}

    public messageCallback(payload: WorkerSendPayload): void {
        if (payload.op === WorkerSendPayloadOp.SessionInfoResponse) {
            this.sessionPromises.get(payload.nonce)?.(payload.session);
            this.sessionPromises.delete(payload.nonce);
        }

        if (payload.op === WorkerSendPayloadOp.ShardIdentifyResponse) {
            const promise = this.waitForIdentifyPromises.get(payload.nonce);
            if (payload.ok) {
                promise?.resolve();
            } else {
                promise?.reject();
            }

            this.waitForIdentifyPromises.delete(payload.nonce);
        }
    }

    public async retrieveSessionInfo(shardId: number): Promise<SessionInfo | null> {
        const nonce = Math.random();
        const payload = {
            op: WorkerReceivePayloadOp.RetrieveSessionInfo,
            shardId,
            nonce
        } satisfies WorkerReceivePayload;
        const promise = new Promise<SessionInfo | null>(resolve => this.sessionPromises.set(nonce, resolve));

        try {
            process.send!(payload);
        } catch {
            setTimeout(async () => Result.fromAsync(() => process.send!(payload)), 2_000);
        }
        return promise;
    }

    public updateSessionInfo(shardId: number, sessionInfo: SessionInfo | null): void {
        const payload = {
            op: WorkerReceivePayloadOp.UpdateSessionInfo,
            shardId,
            session: sessionInfo
        } satisfies WorkerReceivePayload;
        try {
            process.send!(payload);
        } catch {
            setTimeout(async () => Result.fromAsync(() => process.send!(payload)), 2_000);
        }
    }

    public async waitForIdentify(shardId: number, signal: AbortSignal): Promise<void> {
        const nonce = Math.random();

        const payload = {
            op: WorkerReceivePayloadOp.WaitForIdentify,
            nonce,
            shardId
        };

        const promise = new Promise<void>((resolve, reject) => this.waitForIdentifyPromises.set(nonce, { resolve, reject }));

        try {
            process.send!(payload);
        } catch {
            setTimeout(async () => Result.fromAsync(() => process.send!(payload)), 2_000);
        }

        const listener = (): void => {
            process.send!({
                op: WorkerReceivePayloadOp.CancelIdentify,
                nonce
            });
        };

        (signal as unknown as PolyFillAbortSignal).addEventListener("abort", listener);

        try {
            await promise;
        } finally {
            (signal as unknown as PolyFillAbortSignal).removeEventListener("abort", listener);
        }
    }
}
