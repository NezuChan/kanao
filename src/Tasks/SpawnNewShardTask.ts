import { Time } from "@sapphire/time-utilities";
import { Task, TaskOptions } from "../Stores/Task.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<TaskOptions>({
    name: "spawnNewShardTask",
    data: {},
    interval: Time.Minute * 20,
    enabled: process.env.AUTO_SPAWN_SHARDS === "true"
})

export class SpawnNewShardTask extends Task {
    public async run(): Promise<void> {
        this.container.logger!.info("Spawning new shard...");
        const sessionInfo = await this.container.ws!.fetchGatewayInformation(true);
        const shardCount = await this.container.ws!.getShardCount();

        if (sessionInfo.shards !== shardCount) {
            await this.container.ws!.updateShardCount(sessionInfo.shards);
            await this.container.redis!.set(`${this.container.clientId!}:${Constants.SHARDS_KEY}`, shardCount);

            return this.container.logger!.info(`Spawned new shards, shard count is now ${sessionInfo.shards}`);
        }

        this.container.logger!.info("No need to spawn new shards, it's already at the maximum shard count.");
    }
}
