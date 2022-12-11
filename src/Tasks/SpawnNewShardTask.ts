import { Time } from "@sapphire/time-utilities";
import { Task, TaskOptions } from "../Stores/Task.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<TaskOptions>({
    taskOptions: {
        name: "spawnNewShardTask",
        data: {},
        options: {
            delay: Time.Minute * 20
        }
    }
})

export class SpawnNewShardTask extends Task {
    public async run(): Promise<void> {
        this.container.gateway.logger.info("Spawning new shard...");
        const sessionInfo = await this.container.gateway.ws.fetchGatewayInformation(true);
        const shardCount = await this.container.gateway.ws.getShardCount();

        if (sessionInfo.shards !== shardCount) {
            await this.container.gateway.ws.updateShardCount(sessionInfo.shards);
            await this.container.gateway.redis.set("shard_count", shardCount);
            return this.container.gateway.logger.info(`Spawned new shards, shard count is now ${sessionInfo.shards}`);
        }

        this.container.gateway.logger.info("No need to spawn new shards, it's already at the maximum shard count.");
        this.container.gateway.logger.info("Rescheduling task...");
        await this.container.gateway.tasks.sender.post({
            name: this.name,
            options: this.options.taskOptions.options,
            type: "add",
            data: this.options.taskOptions.data
        });
    }
}
