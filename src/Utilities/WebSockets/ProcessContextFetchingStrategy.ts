/* eslint-disable @typescript-eslint/no-shadow */
import { Collection } from "@discordjs/collection";
import { SessionInfo, WorkerReceivePayload, WorkerSendPayload, WorkerReceivePayloadOp, WorkerSendPayloadOp, FetchingStrategyOptions, IContextFetchingStrategy } from "@discordjs/ws";

interface PolyFillAbortSignal {
    readonly aborted: boolean;
    addEventListener: (type: "abort", listener: () => void) => void;
    removeEventListener: (type: "abort", listener: () => void) => void;
}

export class ProcessContextFetchingStrategy implements IContextFetchingStrategy {
    private readonly sessionPromises = new Collection<number, (session: SessionInfo | null) => void>();

    private readonly waitForIdentifyPromises = new Collection<number, { reject: () => void; resolve: () => void }>();

    public constructor(public readonly options: FetchingStrategyOptions) {}

    public messageCallback(payload: WorkerSendPayload) {
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
        // eslint-disable-next-line no-promise-executor-return
        const promise = new Promise<SessionInfo | null>(resolve => this.sessionPromises.set(nonce, resolve));
        process.send!(payload);
        return promise;
    }

    // eslint-disable-next-line class-methods-use-this
    public updateSessionInfo(shardId: number, sessionInfo: SessionInfo | null) {
        const payload = {
            op: WorkerReceivePayloadOp.UpdateSessionInfo,
            shardId,
            session: sessionInfo
        } satisfies WorkerReceivePayload;
        process.send!(payload);
    }

    public async waitForIdentify(shardId: number, signal: AbortSignal): Promise<void> {
        const nonce = Math.random();
        const payload = {
            op: WorkerReceivePayloadOp.WaitForIdentify,
            nonce,
            shardId
        };

        const promise = new Promise<void>((resolve, reject) => this.waitForIdentifyPromises.set(nonce, { resolve, reject }));

        process.send!(payload);

        const listener = () => {
            const payload: WorkerReceivePayload = {
                op: WorkerReceivePayloadOp.CancelIdentify,
                nonce
            };

            process.send!(payload);
        };

        (signal as unknown as PolyFillAbortSignal).addEventListener("abort", listener);

        try {
            await promise;
        } finally {
            (signal as unknown as PolyFillAbortSignal).removeEventListener("abort", listener);
        }
    }
}
