import { Buffer } from "node:buffer";
import process from "node:process";
import { URL } from "node:url";

export const storeLogs = process.env.STORE_LOGS === "true";
export const lokiHost = process.env.LOKI_HOST === undefined ? undefined : new URL(process.env.LOKI_HOST);

export const discordToken = process.env.DISCORD_TOKEN!;
export const amqp = process.env.AMQP_HOST ?? process.env.AMQP_URL ?? "amqp://localhost";
export const clientId = process.env.CLIENT_ID ?? Buffer.from(discordToken.split(".")[0], "base64").toString();
export const production = process.env.NODE_ENV === "production";
export const databaseUrl = process.env.DATABASE_GATEWAY_URL ?? process.env.DATABASE_URL!;
export const databaseConnectionLimit = Number(process.env.DATABASE_CONNECTION_LIMIT ?? 10);

export const stateMembers = process.env.STATE_MEMBER === "true";
export const stateUsers = process.env.STATE_USER === "true";
export const stateVoices = process.env.STATE_VOICE === "true";
export const stateRoles = process.env.STATE_ROLE === "true";
export const stateChannels = process.env.STATE_CHANNEL === "true";
export const stateMessages = process.env.STATE_MESSAGE === "true";

export const guildCreateGcEvery = Number(process.env.GUILD_CREATE_GC_EVERY ?? 150);

export const prefetchCount = Number(process.env.PREFETCH_COUNT ?? 500);
