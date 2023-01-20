import { Collection } from "@discordjs/collection";
import { SessionInfo, WorkerReceivePayload, WorkerSendPayload, WorkerReceivePayloadOp, WorkerSendPayloadOp, FetchingStrategyOptions, IContextFetchingStrategy } from "@discordjs/ws";

export class ProcessContextFetchingStrategy implements IContextFetchingStrategy {
    private readonly sessionPromises = new Collection<number, (session: SessionInfo | null) => void>();

    private readonly waitForIdentifyPromises = new Collection<number, () => void>();

    public constructor(public readonly options: FetchingStrategyOptions) {
        process.on("message", (payload: WorkerSendPayload) => {
            if (payload.op === WorkerSendPayloadOp.SessionInfoResponse) {
                this.sessionPromises.get(payload.nonce)?.(payload.session);
                this.sessionPromises.delete(payload.nonce);
            }

            if (payload.op === WorkerSendPayloadOp.ShardCanIdentify) {
                this.waitForIdentifyPromises.get(payload.nonce)?.();
                this.waitForIdentifyPromises.delete(payload.nonce);
            }
        });
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

    public async waitForIdentify(): Promise<void> {
        const nonce = Math.random();
        const payload = {
            op: WorkerReceivePayloadOp.WaitForIdentify,
            nonce
        } satisfies WorkerReceivePayload;
        // eslint-disable-next-line no-promise-executor-return
        const promise = new Promise<void>(resolve => this.waitForIdentifyPromises.set(nonce, resolve));
        process.send!(payload);
        return promise;
    }
}
