import { PresenceUpdateStatus } from "discord-api-types/v10";
import { default as IORedis } from "ioredis";
import { hostname } from "os";
import Dockerode from "dockerode";
import { chunk, range } from "@sapphire/utilities";
import { Result } from "@sapphire/result";

export const getShardCount = async () => {
    const replicaCount = process.env.GATEWAY_REPLICA_COUNT ? Number(process.env.GATEWAY_REPLICA_COUNT!) : null;
    if (replicaCount && replicaCount > 1) {
        const result = await Result.fromAsync(async () => {
            const docker = new Dockerode();
            const container = docker.getContainer(process.env.HOSTNAME!);
            const inspect = await container.inspect();
            const gatewayShardCount = process.env.GATEWAY_SHARD_COUNT ? Number(process.env.GATEWAY_SHARD_COUNT!) : null;
            const gatewayShardCountPerReplica = process.env.GATEWAY_SHARD_COUNT_PER_REPLICA ? Number(process.env.GATEWAY_SHARD_COUNT_PER_REPLICA!) : null;
            if (gatewayShardCount && gatewayShardCountPerReplica) {
                const shards = gatewayShardCount >= 2 ? range(0, gatewayShardCount, 1) : [0];
                const chunks = chunk(shards, gatewayShardCountPerReplica);
                const parts = inspect.Name.split("-");
                const replicaId = Number(parts[parts.length - 1] ?? 1) - 1;
                const shardIds = chunks[replicaId];
                return {
                    end: shardIds[shardIds.length - 1],
                    start: shardIds[0]
                };
            }
        });
        if (result.isOk()) return result.unwrap();
    }

    return process.env.GATEWAY_SHARD_START && process.env.GATEWAY_SHARD_END
        ? {
            start: Number(process.env.GATEWAY_SHARD_START),
            end: Number(process.env.GATEWAY_SHARD_END)
        }
        : null;
};


export const redisUsername = process.env.REDIS_USERNAME;
export const redisPassword = process.env.REDIS_PASSWORD;
export const redisHost = process.env.REDIS_HOST;
export const redisPort = Number(process.env.REDIS_PORT);
export const redisDb = Number(process.env.REDIS_DB ?? 0);
export const redisNatMap = JSON.parse(process.env.REDIS_NAT_MAP ?? "{}");
export const redisClusters: IORedis.ClusterNode[] = JSON.parse(process.env.REDIS_CLUSTERS ?? "[]");
export const redisClusterScaleReads = process.env.REDIS_CLUSTER_SCALE_READS as IORedis.NodeRole | undefined ?? process.env.REDIS_SCALE_READS as IORedis.NodeRole | undefined ?? "all" as IORedis.NodeRole;
export const redisScanCount = Number(process.env.REDIS_SCAN_COUNT ?? 1000);
export const redisDisablePipelining = process.env.REDIS_DISABLE_PIPELINING === "true";

export const storeLogs = process.env.STORE_LOGS === "true";
export const lokiHost = process.env.LOKI_HOST ? new URL(process.env.LOKI_HOST) : undefined;
export const useRouting = process.env.USE_ROUTING === "true";
export const discordToken = process.env.DISCORD_TOKEN!;
export const proxy = process.env.NIRN_PROXY ?? process.env.HTTP_PROXY ?? "https://discord.com/api";
export const amqp = process.env.AMQP_HOST ?? process.env.AMQP_URL ?? "amqp://localhost";
export const clientId = process.env.CLIENT_ID ?? Buffer.from(discordToken.split(".")[0], "base64").toString();

export const enablePrometheus = process.env.ENABLE_PROMETHEUS === "true";
export const prometheusPort = Number(process.env.PROMETHEUS_PORT ?? 9090);
export const prometheusPath = process.env.PROMETHEUS_PATH ?? "/metrics";

export const gatewayCompression = process.env.GATEWAY_COMPRESSION === "true";
export const gatewayResume = process.env.GATEWAY_RESUME ? process.env.GATEWAY_RESUME === "true" : true;
export const gatewayGuildPerShard = Number(process.env.GUILD_PER_SHARD ?? 2000);
export const gatewayPresenceType = Number(process.env.GATEWAY_PRESENCE_TYPE ?? 0);
export const gatewayPresenceName = process.env.GATEWAY_PRESENCE_NAME;
export const gatewayPresenceStatus = process.env.GATEWAY_PRESENCE_STATUS as PresenceUpdateStatus | undefined ?? PresenceUpdateStatus.Online;
export const gatewayIntents = Number(process.env.GATEWAY_INTENTS ?? 0);
export const gatewayShardsPerWorkers = Number(process.env.GATEWAY_SHARDS_PER_WORKERS ?? 10);
export const gatewayHelloTimeout = process.env.GATEWAY_HELLO_TIMEOUT ? Number(process.env.GATEWAY_HELLO_TIMEOUT!) : null;
export const gatewayReadyTimeout = process.env.GATEWAY_READY_TIMEOUT ? Number(process.env.GATEWAY_READY_TIMEOUT!) : null;
export const gatewayHandShakeTimeout = process.env.GATEWAY_HANDSHAKE_TIMEOUT ? Number(process.env.GATEWAY_HANDSHAKE_TIMEOUT!) : null;
export const gatewayLargeThreshold = Number(process.env.GATEWAY_LARGE_THRESHOLD ?? 250);
export const gatewayShardCount = process.env.GATEWAY_SHARD_COUNT ? Number(process.env.GATEWAY_SHARD_COUNT!) : null;

export const production = process.env.NODE_ENV === "production";

export const stateMembers = process.env.STATE_MEMBER === "true";
export const stateUsers = process.env.STATE_USER === "true";
export const statePresences = process.env.STATE_PRESENCE === "true";
export const stateVoices = process.env.STATE_VOICE === "true";
export const stateRoles = process.env.STATE_ROLE === "true";
export const stateChannels = process.env.STATE_CHANNEL === "true";
export const stateEmojis = process.env.STATE_EMOJI === "true";
export const stateMessages = process.env.STATE_MESSAGE === "true";

export const replicaId = hostname();
export const replicaCount = Number(process.env.GATEWAY_REPLICA_COUNT ?? "1");
