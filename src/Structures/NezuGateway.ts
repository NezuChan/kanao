import EventEmitter from "node:events";
import { createLogger } from "../Utilities/Logger.js";
import { clientId, discordToken, gatewayGuildPerShard, gatewayHandShakeTimeout, gatewayHelloTimeout, gatewayIntents, gatewayLargeThreshold, gatewayPresenceName, gatewayPresenceType, gatewayReadyTimeout, gatewayShardCount, gatewayShardIds, gatewayShardsPerWorkers, lokiHost, proxy, storeLogs } from "../config.js";
import { REST } from "@discordjs/rest";
import { CompressionMethod, SessionInfo, WebSocketManager, WebSocketShardStatus } from "@discordjs/ws";
import { PresenceUpdateStatus } from "discord-api-types/v10";
import { Util } from "@nezuchan/utilities";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessShardingStrategy } from "../Utilities/WebSockets/ProcessShardingStrategy.js";
import { Result } from "@sapphire/result";
import { createRedis } from "../Utilities/CreateRedis.js";

const packageJson = Util.loadJSON<{ version: string }>(`file://${join(fileURLToPath(import.meta.url), "../../../package.json")}`);

export class NezuGateway extends EventEmitter {
    public rest = new REST({ api: proxy, rejectOnRateLimit: proxy === "https://discord.com/api" ? null : () => false });
    public logger = createLogger("nezu-gateway", clientId, storeLogs, lokiHost ? new URL(lokiHost) : undefined);

    public redis = createRedis();

    public ws = new WebSocketManager({
        buildStrategy: (manager: WebSocketManager) => new ProcessShardingStrategy(manager, {
            shardsPerWorker: gatewayShardsPerWorkers
        }),
        intents: gatewayIntents,
        helloTimeout: gatewayHelloTimeout,
        readyTimeout: gatewayReadyTimeout,
        handshakeTimeout: gatewayHandShakeTimeout,
        largeThreshold: gatewayLargeThreshold,
        token: discordToken,
        shardCount: gatewayShardCount,
        shardIds: gatewayShardIds,
        initialPresence: {
            activities: [
                {
                    name: gatewayPresenceName ?? `NezukoChan Gateway v${packageJson.version}`,
                    type: gatewayPresenceType
                }
            ],
            since: Date.now(),
            status: PresenceUpdateStatus.Online,
            afk: false
        },
        updateSessionInfo: async (shardId: number, sessionInfo: SessionInfo) => {
            const result = await Result.fromAsync(() => this.redis.set(`${clientId}:gateway_shard_session:${shardId}`, JSON.stringify(sessionInfo)));
            if (result.isOk()) return;
            this.logger.error(result.unwrapErr(), "Failed to update session info");
        },
        retrieveSessionInfo: async (shardId: number) => {
            const result = await Result.fromAsync(() => this.redis.get(`${clientId}:gateway_shard_session:${shardId}`));
            const sessionInfo = result.isOk() ? result.unwrap() : null;
            if (sessionInfo) return JSON.parse(sessionInfo) as SessionInfo;
            if (result.isErr()) this.logger.error(result.unwrapErr(), "Failed to retrieve session info");
            return null;
        },
        compression: CompressionMethod.ZlibStream,
        rest: this.rest
    });

    public constructor() {
        super();
        this.rest.setToken(discordToken);
    }

    public async connect(): Promise<void> {
        if (gatewayGuildPerShard) {
            const { shards } = await this.ws.fetchGatewayInformation(true);
            this.ws.options.shardCount = Number(Math.ceil((shards * (1_000 / Number(gatewayGuildPerShard))) / 1));
        }

        await this.ws.connect();
        const shardCount = await this.ws.getShardCount();

        let shardId = -1;
        while (shardId < (shardCount - 1)) {
            shardId += 1; await this.redis.set(`${clientId}:gateway_shard_status:${shardId}`, JSON.stringify({ latency: -1, status: WebSocketShardStatus.Connecting }));
        }

        await this.redis.set(`${clientId}:gateway_shard_count`, shardCount);
    }
}
