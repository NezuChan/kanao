    /* eslint-disable no-case-declarations */
import { WebSocketShardEvents } from "@discordjs/ws";
import { ProcessBootstrapper } from "./ProcessBootstrapper.js";
import { NezuGateway } from "../../Structures/NezuGateway.js";

const gateway = new NezuGateway();
await gateway.connect();

const bootstrapper = new ProcessBootstrapper();
void bootstrapper.bootstrap({
    forwardEvents: [],
    shardCallback: shard => {
        for (const event of Object.values(WebSocketShardEvents)) {
            if (event === WebSocketShardEvents.Dispatch) {
                shard.on(event, data => gateway.emit(event, { ...data, shardId: shard.id }));
                continue;
            }
            // @ts-expect-error Type return missmatch
            shard.on(event, data => gateway.emit(event, { ...data, shardId: shard.id }));
        }
    }
});
