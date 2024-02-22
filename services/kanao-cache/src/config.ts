/* eslint-disable consistent-return */
import { Buffer } from "node:buffer";
import process from "node:process";
import { URL } from "node:url";
import { Result } from "@sapphire/result";
import { chunk, range } from "@sapphire/utilities";
import Dockerode from "dockerode";

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
export const amqp = process.env.AMQP_HOST ?? process.env.AMQP_URL ?? "amqp://localhost";
export const clientId = process.env.CLIENT_ID ?? Buffer.from(discordToken.split(".")[0], "base64").toString();
export const production = process.env.NODE_ENV === "production";
export const databaseUrl = process.env.DATABASE_GATEWAY_URL ?? process.env.DATABASE_URL!;

export const stateMembers = process.env.STATE_MEMBER === "true";
export const stateUsers = process.env.STATE_USER === "true";
export const stateVoices = process.env.STATE_VOICE === "true";
export const stateRoles = process.env.STATE_ROLE === "true";
export const stateChannels = process.env.STATE_CHANNEL === "true";
export const stateMessages = process.env.STATE_MESSAGE === "true";

export const guildCreateGcEvery = Number(process.env.GUILD_CREATE_GC_EVERY ?? 50);
