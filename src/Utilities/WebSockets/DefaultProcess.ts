import { WebSocketShardEvents } from "@discordjs/ws";
import { ProcessBootstrapper } from "./ProcessBootstrapper.js";
import { storeLogs, lokiHost, discordToken } from "../../config.js";
import { createLogger } from "../Logger.js";

const bootstrapper = new ProcessBootstrapper();
const logger = createLogger("nezu-gateway", Buffer.from(discordToken.split(".")[0], "base64").toString(), storeLogs, lokiHost ? new URL(lokiHost) : undefined);

void bootstrapper.bootstrap({
    shardCallback: shard => {
        shard.on(WebSocketShardEvents.Ready, () => {
            logger.info(`Shard ${shard.id} is ready`);
        });
        shard.on(WebSocketShardEvents.Resumed, () => {
            logger.info(`Shard ${shard.id} has resumed`);
        });
    }
});
