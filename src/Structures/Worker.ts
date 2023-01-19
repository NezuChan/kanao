import { WorkerBootstrapper, WebSocketShardEvents } from "@discordjs/ws";

const bootstrapper = new WorkerBootstrapper();

if (process.env.NODE_ENV === "development") {
    console.log(process.memoryUsage());
}


await bootstrapper.bootstrap({
    forwardEvents: [
        WebSocketShardEvents.Closed,
        WebSocketShardEvents.Debug,
        WebSocketShardEvents.Hello,
        WebSocketShardEvents.Ready,
        WebSocketShardEvents.Resumed,
        WebSocketShardEvents.Dispatch
    ]
});
