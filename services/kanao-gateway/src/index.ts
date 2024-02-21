/* eslint-disable @typescript-eslint/restrict-template-expressions */
import "dotenv/config";

import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Util } from "@nezuchan/utilities";
import { range } from "@sapphire/utilities";
import { createBanner } from "@skyra/start-banner";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import gradient from "gradient-string";
import pg from "pg";
import { NezuGateway } from "./Structures/KanaoGateway.js";
import { databaseUrl, getShardCount, replicaCount, replicaId } from "./config.js";

const gateway = new NezuGateway();
const packageJson = Util.loadJSON<{ version: string; }>(`file://${join(fileURLToPath(import.meta.url), "../../package.json")}`);
const shardIds = await getShardCount();

const migClient = new pg.Client(databaseUrl);

await migrate(drizzle(migClient), { migrationsFolder: "./node_modules/@nezuchan/kanao-schema/drizzle" });

await migClient.end();

try {
    await gateway.connect();
} catch (error) {
    gateway.logger.error(error, "An error occurred while connecting to Discord");
    process.exit(1);
}

console.log(
    gradient.vice.multiline(
        createBanner({
            logo: [
                String.raw`       __`,
                String.raw`    __╱‾‾╲__`,
                String.raw` __╱‾‾╲__╱‾‾╲__`,
                String.raw`╱‾‾╲__╱  ╲__╱‾‾╲`,
                String.raw`╲__╱  ╲__╱  ╲__╱`,
                String.raw`   ╲__╱  ╲__╱`,
                String.raw`      ╲__╱`,
                ""
            ],
            name: [
                String.raw`    _______  ________  ________  ________  ________  ________  ________ `,
                String.raw`  ╱╱       ╲╱        ╲╱        ╲╱        ╲╱  ╱  ╱  ╲╱        ╲╱    ╱   ╲ `,
                String.raw` ╱╱      __╱         ╱        _╱         ╱         ╱         ╱         ╱ `,
                String.raw`╱       ╱ ╱         ╱╱       ╱╱        _╱         ╱         ╱╲__      ╱ `,
                String.raw`╲________╱╲___╱____╱ ╲______╱ ╲________╱╲________╱╲___╱____╱   ╲_____╱ `
            ],
            extra: [
                ` Kanao Gateway: v${packageJson.version}`,
                ` ├ ReplicaId: ${replicaId}`,
                ` ├ ReplicaCount: ${replicaCount}`,
                ` ├ Shards: ${shardIds ? range(shardIds.start, shardIds.end!, 1).join(", ") : range(0, (gateway.ws.options.shardCount ?? 1) - 1, 1).join(", ")}`,
                ` └ ShardCount: ${gateway.ws.options.shardCount ?? 1} shards`
            ]
        })
    )
);

process.on("unhandledRejection", e => {
    if (e instanceof Error) {
        gateway.logger.error(e);
    } else {
        gateway.logger.error(new Error(`PromiseError: ${e}`));
    }
});
process.on("uncaughtException", e => {
    gateway.logger.fatal(e);
    process.exit(1);
});
