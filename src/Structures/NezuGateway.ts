import EventEmitter from "node:events";
import { createLogger } from "../Utilities/Logger.js";
import { discordToken, gatewayHandShakeTimeout, gatewayHelloTimeout, gatewayIntents, gatewayLargeThreshold, gatewayPresenceName, gatewayPresenceType, gatewayReadyTimeout, gatewayShardCount, gatewayShardIds, gatewayShardsPerWorkers, lokiHost, proxy, redisClusterScaleReads, redisClusters, redisDb, redisHost, redisNatMap, redisPassword, redisPort, redisUsername, storeLogs } from "../config.js";
import { REST } from "@discordjs/rest";
import { CompressionMethod, SessionInfo, WebSocketManager } from "@discordjs/ws";
import { PresenceUpdateStatus } from "discord-api-types/v10";
import { Util } from "@nezuchan/utilities";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessShardingStrategy } from "../Utilities/WebSockets/ProcessShardingStrategy.js";
import { default as IORedis } from "ioredis";
import { Result } from "@sapphire/result";

const { default: Redis, Cluster } = IORedis;
const packageJson = Util.loadJSON<{ version: string }>(`file://${join(fileURLToPath(import.meta.url), "../../../package.json")}`);

export class NezuGateway extends EventEmitter {
    public clientId = Buffer.from(discordToken.split(".")[0], "base64").toString();
    public rest = new REST({ api: proxy, rejectOnRateLimit: proxy === "https://discord.com/api" ? null : () => false });
    public logger = createLogger("nezu-gateway", this.clientId, storeLogs, lokiHost ? new URL(lokiHost) : undefined);

    public redis =
        redisClusters.length
            ? new Cluster(
                redisClusters,
                {
                    scaleReads: redisClusterScaleReads as IORedis.NodeRole,
                    redisOptions: {
                        password: redisPassword,
                        username: redisUsername,
                        db: redisDb
                    },
                    natMap: redisNatMap
                }
            )
            : new Redis({
                username: redisPassword,
                password: redisPassword,
                host: redisHost,
                port: redisPort,
                db: redisDb,
                natMap: redisNatMap
            });

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
            const result = await Result.fromAsync(() => this.redis.set(`${this.clientId}:gateway_shard_session:${shardId}`, JSON.stringify(sessionInfo)));
            if (result.isOk()) return;
            this.logger.error(result.unwrapErr(), "Failed to update session info");
        },
        retrieveSessionInfo: async (shardId: number) => {
            const result = await Result.fromAsync(() => this.redis.get(`${this.clientId}:gateway_shard_session:${shardId}`));
            const sessionInfo = result.isOk() ? result.unwrap() : null;
            if (sessionInfo) return JSON.parse(sessionInfo) as SessionInfo;
            this.logger.error(result.isErr() && result.unwrapErr(), "Failed to retrieve session info");
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
        await this.ws.connect();
    }
}
