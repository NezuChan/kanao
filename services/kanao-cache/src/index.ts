/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Util } from "@nezuchan/utilities";
import { createBanner } from "@skyra/start-banner";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import gradient from "gradient-string";
import pg from "pg";
import { KanaoCache } from "./Structures/KanaoCache.js";
import { databaseUrl } from "./config.js";

const cache = new KanaoCache();
const packageJson = Util.loadJSON<{ version: string; }>(`file://${join(fileURLToPath(import.meta.url), "../../package.json")}`);

const migClient = new pg.Client(databaseUrl);

await migClient.connect();

await migrate(drizzle(migClient), { migrationsFolder: "./node_modules/@nezuchan/kanao-schema/drizzle" });

await migClient.end();

try {
    await cache.connect();
} catch (error) {
    cache.logger.error(error, "An error occurred while connecting to Discord");
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
                String.raw`   ______           __       `,
                String.raw`  / ____/___ ______/ /_  ___ `,
                String.raw` / /   / __ '/ ___/ __ \/ _ \ `,
                String.raw`/ /___/ /_/ / /__/ / / /  __/ `,
                String.raw`\____/\__,_/\___/_/ /_/\___/ `
            ],
            extra: [
                ` Kanao Cache: v${packageJson.version}`
            ]
        })
    )
);

cache.logger.info("Cache is ready, awaiting payload from gateway !");

process.on("unhandledRejection", e => {
    if (e instanceof Error) {
        cache.logger.error(e);
    } else {
        cache.logger.error(new Error(`PromiseError: ${e}`));
    }
});
process.on("uncaughtException", e => {
    cache.logger.fatal(e);
    process.exit(1);
});
