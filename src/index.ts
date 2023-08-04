import "dotenv/config";

import gradient from "gradient-string";
import { createBanner } from "@skyra/start-banner";
import { Util } from "@nezuchan/utilities";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NezuGateway } from "./Structures/NezuGateway.js";
import { getShardCount, replicaCount, replicaId } from "./config.js";
import { range } from "@sapphire/utilities";

const gateway = new NezuGateway();
const packageJson = Util.loadJSON<{ version: string }>(`file://${join(fileURLToPath(import.meta.url), "../../package.json")}`);
const shardIds = await getShardCount();

try {
    await gateway.connect();
} catch (e) {
    gateway.logger.error(e, "An error occurred while connecting to Discord");
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
                ` Nezu Gateway: v${packageJson.version}`,
                ` ├ ReplicaId: ${replicaId}`,
                ` ├ ReplicaCount: ${replicaCount}`,
                ` ├ Shards: ${shardIds ? range(shardIds.start, shardIds.end, 1) : range(0, (gateway.ws.options.shardCount ?? 1) - 1, 1)}`,
                ` └ ShardCount: ${gateway.ws.options.shardCount ?? 1} shards`
            ]
        })
    )
);

process.on("unhandledRejection", e => {
    if (e instanceof Error) {
        gateway.logger.error(e);
    } else {
        gateway.logger.error(Error(`PromiseError: ${e}`));
    }
});
process.on("uncaughtException", e => {
    gateway.logger.fatal(e);
    process.exit(1);
});
