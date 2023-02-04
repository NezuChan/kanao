/* eslint-disable no-case-declarations */
import { WebSocketShardEvents, WorkerReceivePayload, WorkerReceivePayloadOp } from "@discordjs/ws";
import { ProcessBootstrapper } from "./ProcessBootstrapper.js";
import { NezuGateway } from "../../Structures/NezuGateway.js";

const gateway = new NezuGateway();
await gateway.connect();

const bootstrapper = new ProcessBootstrapper();
void bootstrapper.bootstrap({
    forwardEvents: [
        WebSocketShardEvents.Closed,
        WebSocketShardEvents.Debug,
        WebSocketShardEvents.HeartbeatComplete,
        WebSocketShardEvents.Hello,
        WebSocketShardEvents.Resumed
    ],
    shardCallback: shard => {
        shard.on(WebSocketShardEvents.Dispatch, data => gateway.emit(WebSocketShardEvents.Dispatch, { ...data, shardId: shard.id }));
        shard.on(WebSocketShardEvents.Ready, data => {
            const payload = {
                op: WorkerReceivePayloadOp.Event,
                event: WebSocketShardEvents.Ready,
                data,
                shardId: shard.id
            } satisfies WorkerReceivePayload;
            process.send!(payload);
        });
    }
});
