/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
import { RedisCollection } from "@nezuchan/redis-collection";
import { Time } from "@sapphire/time-utilities";
import { Task, TaskOptions } from "../Stores/Task.js";
import { RedisKey } from "@nezuchan/constants";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Result } from "@sapphire/result";
import { Util } from "../Utilities/Util.js";
import { enablePrometheus } from "../config.js";

@ApplyOptions<TaskOptions>({
    taskOptions: {
        name: "prometheusTask",
        data: {},
        options: {
            delay: Time.Second * 10
        }
    },
    enabled: enablePrometheus
})

export class PrometheusTask extends Task {
    public guildCounter = new this.container.prometheus!.client.Counter({
        name: "guild_count",
        help: "Guild count"
    });

    public channelCounter = new this.container.prometheus!.client.Counter({
        name: "channel_count",
        help: "Channel count"
    });

    public socketCounter = new this.container.prometheus!.client.Gauge({
        name: "ws_ping",
        help: "Websocket ping",
        labelNames: ["shardId"]
    });

    public userCounter = new this.container.prometheus!.client.Counter({
        name: "user_count",
        help: "User count"
    });

    public static readonly PROMETHEUS_TASK = "prometheus-task";

    public async run(): Promise<void> {
        const previousTask = await this.container.redis!.hget(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, "lastRun");
        if (previousTask) {
            await this.container.redis!.expire(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, 8);
            return this.container.logger!.warn("Possible dupe [prometheusTask] task, skipping...");
        }

        const guild_keys = await Util.sscanStreamPromise(this.container.redis!, this.container.gateway.genKey(RedisKey.GUILD_KEY, true), `${this.container.gateway.clientId}:*`, 1000);
        const channel_keys = await Util.sscanStreamPromise(this.container.redis!, this.container.gateway.genKey(RedisKey.CHANNEL_KEY, true), `${this.container.gateway.clientId}:*`, 1000);
        let member_count = 0;

        const guildCollection = new RedisCollection<string, { id: string; member_count: number }>({
            redis: this.container.redis!,
            hash: Util.genKey(RedisKey.GUILD_KEY, this.container.gateway.clientId, false)
        });

        for (const guildKey of guild_keys) {
            const guild = await guildCollection.get(guildKey);
            if (guild) member_count += guild.member_count ?? 0;
        }

        this.guildCounter.reset();
        this.guildCounter.inc(guild_keys.length === 0 ? await guildCollection.size : guild_keys.length);

        this.channelCounter.reset();
        this.channelCounter.inc(channel_keys.length);

        this.userCounter.reset();
        this.userCounter.inc(member_count);

        this.socketCounter.reset();

        const socketCollection = new RedisCollection<string, { shardId: string; latency: string }>({
            redis: this.container.redis!,
            hash: Util.genKey(RedisKey.STATUSES_KEY, this.container.gateway.clientId, false)
        });
        const shardCount = this.container.ws?.options.shardCount ?? 1;
        for (let i = 0; i < shardCount; i++) {
            const socketStatus = await socketCollection.get(i.toString());
            if (socketStatus) this.socketCounter.set({ shardId: socketStatus.shardId }, Number(socketStatus.latency));
        }

        await this.container.redis!.hset(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, "lastRun", Date.now());
        await this.container.redis!.expire(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, 8);

        await this.container.tasks!.sender.post({
            name: this.name,
            options: this.options.taskOptions.options,
            type: "add",
            data: this.options.taskOptions.data
        });
        await this.container.redis!.hget(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, "lastRun");
        await this.container.redis!.expire(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, 8);
        this.container.logger!.info("Updated prometheus metrics");
    }

    public override onLoad(): unknown {
        void Result.fromAsync(async () => {
            const previousTask = await this.container.redis!.hget(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, "lastRun");
            if (previousTask) {
                await this.container.redis!.expire(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, 8);
                return this.container.logger!.warn("Possible dupe [prometheusTask] task, skipping...");
            }

            await this.container.tasks!.sender.post({
                name: this.name,
                options: this.options.taskOptions.options,
                type: "add",
                data: this.options.taskOptions.data
            });

            await this.container.redis!.hset(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, "lastRun", Date.now());
            await this.container.redis!.expire(`${this.container.clientId!}:${PrometheusTask.PROMETHEUS_TASK}`, 8);
        });
        return super.onLoad();
    }
}
