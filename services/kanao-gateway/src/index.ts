/* eslint-disable @typescript-eslint/restrict-template-expressions */
import "dotenv/config";

import { access, constants, mkdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Util } from "@nezuchan/utilities";
import { range } from "@sapphire/utilities";
import { createBanner } from "@skyra/start-banner";
import gradient from "gradient-string";
import { NezuGateway } from "./Structures/KanaoGateway.js";
import { getShardCount, replicaCount, replicaId } from "./config.js";

try {
    await access(join(process.cwd(), "storage"), constants.F_OK);
} catch (error) {
    if ((error as { code: "ENOENT"; }).code === "ENOENT") {
        await mkdir(join(process.cwd(), "storage"));
    } else {
        throw error;
    }
}

const gateway = new NezuGateway();
const packageJson = Util.loadJSON<{ version: string; }>(`file://${join(fileURLToPath(import.meta.url), "../../package.json")}`);
const shardIds = await getShardCount();

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
