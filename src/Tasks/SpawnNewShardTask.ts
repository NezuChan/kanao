/* eslint-disable @typescript-eslint/naming-convention */
import { Time } from "@sapphire/time-utilities";
import { Task, TaskOptions } from "../Stores/Task.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Result } from "@sapphire/result";
import { RedisKey } from "@nezuchan/constants";

@ApplyOptions<TaskOptions>({
    taskOptions: {
        name: "spawnNewShardTask",
        data: {},
        options: {
            delay: Time.Minute * 20
        }
    },
    enabled: process.env.AUTO_SPAWN_SHARDS === "true"
})

export class SpawnNewShardTask extends Task {
    public static readonly SPAWN_NEW_SHARD_TASK = "spawn-new-shard-task";
    public async run(): Promise<void> {
        const previousTask = await this.container.redis!.hget(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, "lastRun");
        if (previousTask) {
            await this.container.redis!.expire(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, ((Time.Minute * 20) / 1000) - 10);
            return this.container.logger!.warn("Possible dupe [spawnNewShardTask] task, skipping...");
        }

        this.container.logger!.info("Spawning new shard...");
        const sessionInfo = await this.container.ws!.fetchGatewayInformation(true);
        const shardCount = await this.container.ws!.getShardCount();

        await this.container.redis!.hset(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, "lastRun", Date.now());
        await this.container.redis!.expire(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, ((Time.Minute * 20) / 1000) - 10);

        await this.container.tasks!.sender.post({
            name: this.name,
            options: this.options.taskOptions.options,
            type: "add",
            data: this.options.taskOptions.data
        });

        await this.container.redis!.hget(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, "lastRun");
        await this.container.redis!.expire(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, ((Time.Minute * 20) / 1000) - 10);

        if (sessionInfo.shards !== shardCount) {
            await this.container.ws!.updateShardCount(sessionInfo.shards);
            await this.container.redis!.set(`${this.container.clientId!}:${RedisKey.SHARDS_KEY}`, shardCount);

            return this.container.logger!.info(`Spawned new shards, shard count is now ${sessionInfo.shards}`);
        }

        this.container.logger!.info("No need to spawn new shards, it's already at the maximum shard count.");
    }

    public override onLoad(): unknown {
        void Result.fromAsync(async () => {
            const previousTask = await this.container.redis!.hget(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, "lastRun");
            if (previousTask) {
                await this.container.redis!.expire(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, ((Time.Minute * 20) / 1000) - 10);
                return this.container.logger!.warn("Possible dupe [spawnNewShardTask] task, skipping...");
            }

            await this.container.tasks!.sender.post({
                name: this.name,
                options: this.options.taskOptions.options,
                type: "add",
                data: this.options.taskOptions.data
            });

            await this.container.redis!.hset(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, "lastRun", Date.now());
            await this.container.redis!.expire(`${this.container.clientId!}:${SpawnNewShardTask.SPAWN_NEW_SHARD_TASK}`, ((Time.Minute * 20) / 1000) - 10);
        });
        this.container.tasks!.receiver.on(this.name, this._run.bind(this));
        return super.onLoad();
    }
}
