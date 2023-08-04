import { Result } from "@sapphire/result";
import { PresenceUpdateStatus } from "discord-api-types/v10";
import { readFileSync } from "fs";
import { default as IORedis } from "ioredis";
import { hostname } from "os";
import { parse } from "yaml";

const file = Result.from(() => readFileSync("./config.yml", "utf-8")).unwrapOr(null);
const yaml = parse(file ?? "") as YamlConfig | null;

export const redisUsername = process.env.REDIS_USERNAME;
export const redisPassword = process.env.REDIS_PASSWORD;
export const redisHost = process.env.REDIS_HOST;
export const redisPort = Number(process.env.REDIS_PORT);
export const redisDb = Number(process.env.REDIS_DB ?? 0);
export const redisNatMap = JSON.parse(process.env.REDIS_NAT_MAP ?? "{}");
export const redisClusters: IORedis.ClusterNode[] = JSON.parse(process.env.REDIS_CLUSTERS ?? "[]");
export const redisClusterScaleReads = process.env.REDIS_CLUSTER_SCALE_READS as IORedis.NodeRole | undefined ?? process.env.REDIS_SCALE_READS as IORedis.NodeRole | undefined ?? "all" as IORedis.NodeRole;

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
export const gatewayShardCount = yaml?.gateway.shard_count ?? process.env.GATEWAY_SHARD_COUNT ? Number(process.env.GATEWAY_SHARD_COUNT!) : null;
export const gatewayShardIds = (yaml?.gateway.shard_start || process.env.GATEWAY_SHARD_START) && (yaml?.gateway.shard_end || process.env.GATEWAY_SHARD_END)
    ? {
        start: yaml?.gateway.shard_start ?? Number(process.env.GATEWAY_SHARD_START),
        end: yaml?.gateway.shard_end ?? Number(process.env.GATEWAY_SHARD_END)
    }
    : null;

export const production = process.env.NODE_ENV === "production";

export const stateMembers = process.env.STATE_MEMBER === "true";
export const stateUsers = process.env.STATE_USER === "true";
export const statePresences = process.env.STATE_PRESENCE === "true";
export const stateVoices = process.env.STATE_VOICE === "true";
export const stateRoles = process.env.STATE_ROLE === "true";
export const stateChannels = process.env.STATE_CHANNEL === "true";
export const stateEmojis = process.env.STATE_EMOJI === "true";
export const stateMessages = process.env.STATE_MESSAGE === "true";

export const replicaId = yaml?.replica.id ?? process.env.REPLICA_ID ?? hostname();
export const replicaCount = yaml?.replica.count ?? Number(process.env.REPLICA_COUNT ?? "1");

interface YamlConfig {
    gateway: {
        shard_count?: number;
        shard_start?: number;
        shard_end?: number;
        shard_per_replica?: number;
    };
    replica: {
        id?: number;
        count?: number;
    };
}
