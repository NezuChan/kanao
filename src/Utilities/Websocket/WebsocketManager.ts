/* eslint-disable @typescript-eslint/dot-notation */
import { WebSocketManager as BaseManager } from "@discordjs/ws";
import { range } from "@discordjs/util";

export class WebSocketManager extends BaseManager {
    public async getShardIds(force = false): Promise<number[]> {
        if (this["shardIds"] && !force) {
            return this["shardIds"];
        }

        let shardIds: number[];
        if (this.options.shardIds) {
            if (Array.isArray(this.options.shardIds)) {
                shardIds = this.options.shardIds;
            } else {
                const { start, end } = this.options.shardIds;
                shardIds = [...range({ start, end: end + 1 })];
            }
        } else {
            const data = await this.fetchGatewayInformation();
            shardIds = [...range(this.options.shardCount ?? data.shards)];
        }

        this["shardIds"] = shardIds;
        return shardIds;
    }
}
