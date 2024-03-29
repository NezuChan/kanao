/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-shadow */
import { Buffer } from "node:buffer";
import { hostname } from "node:os";
import process from "node:process";
import { URL } from "node:url";
import { Result } from "@sapphire/result";
import { chunk, range } from "@sapphire/utilities";
import { PresenceUpdateStatus } from "discord-api-types/v10";
import Dockerode from "dockerode";

export const replicaId = hostname();
export const replicaCount = Number(process.env.GATEWAY_REPLICA_COUNT ?? "1");

export const getShardCount = async (): Promise<{ end: number | undefined; start: number; } | null | undefined> => {
    const replicaCount = process.env.GATEWAY_REPLICA_COUNT === undefined ? null : Number(process.env.GATEWAY_REPLICA_COUNT);
    if (replicaCount !== undefined && (replicaCount !== null) && replicaCount > 1) {
        const result = await Result.fromAsync(async (): Promise<{ end: number | undefined; start: number; } | null | undefined> => {
            const docker = new Dockerode();
            const container = docker.getContainer(process.env.HOSTNAME!);
            const inspect = await container.inspect();
            const gatewayShardCount = process.env.GATEWAY_SHARD_COUNT === undefined ? null : Number(process.env.GATEWAY_SHARD_COUNT);
            const gatewayShardCountPerReplica = process.env.GATEWAY_SHARD_COUNT_PER_REPLICA === undefined ? null : Number(process.env.GATEWAY_SHARD_COUNT_PER_REPLICA);
            if (gatewayShardCount !== null && gatewayShardCountPerReplica !== null) {
                const shards = gatewayShardCount >= 2 ? range(0, gatewayShardCount, 1) : [0];
                const chunks = chunk(shards, gatewayShardCountPerReplica);
                const parts = inspect.Name.split("-");
                const replicaId = Number(parts.at(-1) ?? 1) - 1;
                const shardIds = chunks[replicaId];
                return {
                    end: shardIds.at(-1),
                    start: shardIds[0]
                };
            }
        });
        if (result.isOk()) return result.unwrap();

        const parts = replicaId.split("-");
        const id = Number(parts.at(-1) ?? 0);

        const gatewayShardCount = process.env.GATEWAY_SHARD_COUNT === undefined ? null : Number(process.env.GATEWAY_SHARD_COUNT);
        const gatewayShardCountPerReplica = process.env.GATEWAY_SHARD_COUNT_PER_REPLICA === undefined ? null : Number(process.env.GATEWAY_SHARD_COUNT_PER_REPLICA);

        if (gatewayShardCount !== null && gatewayShardCountPerReplica !== null) {
            const shards = gatewayShardCount >= 2 ? range(0, gatewayShardCount, 1) : [0];
            const chunks = chunk(shards, gatewayShardCountPerReplica);

            const shardIds = chunks[id];
            return {
                end: shardIds.at(-1),
                start: shardIds[0]
            };
        }
    }

    return process.env.GATEWAY_SHARD_START !== undefined && process.env.GATEWAY_SHARD_END !== undefined
        ? {
            start: Number(process.env.GATEWAY_SHARD_START),
            end: Number(process.env.GATEWAY_SHARD_END)
        }
        : null;
};

export const storeLogs = process.env.STORE_LOGS === "true";
export const lokiHost = process.env.LOKI_HOST === undefined ? undefined : new URL(process.env.LOKI_HOST);
export const discordToken = process.env.DISCORD_TOKEN!;
export const proxy = process.env.NIRN_PROXY ?? process.env.HTTP_PROXY ?? "https://discord.com/api";
export const amqp = process.env.AMQP_HOST ?? process.env.AMQP_URL ?? "amqp://localhost";
export const clientId = process.env.CLIENT_ID ?? Buffer.from(discordToken.split(".")[0], "base64").toString();

export const enablePrometheus = process.env.ENABLE_PROMETHEUS === "true";
export const prometheusPort = Number(process.env.PROMETHEUS_PORT ?? 9_090);
export const prometheusPath = process.env.PROMETHEUS_PATH ?? "/metrics";

export const gatewayCompression = process.env.GATEWAY_COMPRESSION ? true : process.env.GATEWAY_COMPRESSION === "true";
export const gatewayResume = process.env.GATEWAY_RESUME === undefined ? true : process.env.GATEWAY_RESUME === "true";
export const gatewayGuildPerShard = Number(process.env.GUILD_PER_SHARD ?? 2_000);
export const gatewayPresenceType = Number(process.env.GATEWAY_PRESENCE_TYPE ?? 0);
export const gatewayPresenceName = process.env.GATEWAY_PRESENCE_NAME;
export const gatewayPresenceStatus = process.env.GATEWAY_PRESENCE_STATUS as PresenceUpdateStatus | undefined ?? PresenceUpdateStatus.Online;
export const gatewayIntents = Number(process.env.GATEWAY_INTENTS ?? 0);
export const gatewayShardsPerWorkers = Number(process.env.GATEWAY_SHARDS_PER_WORKERS ?? 10);
export const gatewayHelloTimeout = process.env.GATEWAY_HELLO_TIMEOUT === undefined ? null : Number(process.env.GATEWAY_HELLO_TIMEOUT);
export const gatewayReadyTimeout = process.env.GATEWAY_READY_TIMEOUT === undefined ? null : Number(process.env.GATEWAY_READY_TIMEOUT);
export const gatewayHandShakeTimeout = process.env.GATEWAY_HANDSHAKE_TIMEOUT === undefined ? null : Number(process.env.GATEWAY_HANDSHAKE_TIMEOUT);
export const gatewayLargeThreshold = Number(process.env.GATEWAY_LARGE_THRESHOLD ?? 250);
export const gatewayShardCount = process.env.GATEWAY_SHARD_COUNT === undefined ? null : Number(process.env.GATEWAY_SHARD_COUNT);

export const production = process.env.NODE_ENV === "production";

export const stateMembers = process.env.STATE_MEMBER === "true";
export const stateUsers = process.env.STATE_USER === "true";
export const stateVoices = process.env.STATE_VOICE === "true";
export const stateRoles = process.env.STATE_ROLE === "true";
export const stateChannels = process.env.STATE_CHANNEL === "true";
export const stateMessages = process.env.STATE_MESSAGE === "true";

export const databaseUrl = process.env.DATABASE_GATEWAY_URL ?? process.env.DATABASE_URL!;

export const guildCreateGcEvery = Number(process.env.GUILD_CREATE_GC_EVERY ?? 50);
