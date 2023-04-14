import EventEmitter from "node:events";
import { createLogger } from "../Utilities/Logger.js";
import { discordToken, gatewayHandShakeTimeout, gatewayHelloTimeout, gatewayIntents, gatewayLargeThreshold, gatewayPresenceName, gatewayPresenceType, gatewayReadyTimeout, gatewayShardCount, gatewayShardIds, gatewayShardsPerWorkers, lokiHost, proxy, storeLogs } from "../config.js";
import { REST } from "@discordjs/rest";
import { CompressionMethod, WebSocketManager } from "@discordjs/ws";
import { PresenceUpdateStatus } from "discord-api-types/v10";
import { Util } from "@nezuchan/utilities";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessShardingStrategy } from "../Utilities/WebSockets/ProcessShardingStrategy.js";
const packageJson = Util.loadJSON<{ version: string }>(`file://${join(fileURLToPath(import.meta.url), "../../package.json")}`);

export class NezuGateway extends EventEmitter {
    public clientId = Buffer.from(discordToken!.split(".")[0], "base64").toString();
    public rest = new REST({ api: proxy, rejectOnRateLimit: proxy === "https://discord.com/api" ? null : () => false });
    public logger = createLogger("nezu-gateway", this.clientId, storeLogs, lokiHost ? new URL(lokiHost) : undefined);

    public ws = new WebSocketManager({
        buildStrategy: (manager: WebSocketManager) => new ProcessShardingStrategy(manager, {
            shardsPerWorker: gatewayShardsPerWorkers
        }),
        intents: gatewayIntents,
        helloTimeout: gatewayHelloTimeout,
        readyTimeout: gatewayReadyTimeout,
        handshakeTimeout: gatewayHandShakeTimeout,
        largeThreshold: gatewayLargeThreshold,
        token: discordToken!,
        shardCount: gatewayShardCount,
        shardIds: gatewayShardIds,
        initialPresence: {
            activities: [
                {
                    name: gatewayPresenceName ?? `NezukoChan Gateway ${packageJson.version}`,
                    type: gatewayPresenceType
                }
            ],
            since: Date.now(),
            status: PresenceUpdateStatus.Online,
            afk: false
        },
        compression: CompressionMethod.ZlibStream,
        rest: this.rest
    });

    public async connect(): Promise<void> {
        await Promise.resolve();
    }
}
