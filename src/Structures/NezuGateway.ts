import EventEmitter from "node:events";
import { createLogger } from "../Utilities/Logger.js";
import { discordToken, lokiHost, storeLogs } from "../config.js";

export class NezuGateway extends EventEmitter {
    public clientId = Buffer.from(discordToken!.split(".")[0], "base64").toString();
    public logger = createLogger("nezu-gateway", this.clientId, storeLogs, lokiHost ? new URL(lokiHost) : undefined);
    public async connect(): Promise<void> {
        await Promise.resolve();
    }
}
