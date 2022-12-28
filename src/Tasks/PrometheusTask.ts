/* eslint-disable @typescript-eslint/naming-convention */
import { RedisCollection } from "@nezuchan/redis-collection";
import { Time } from "@sapphire/time-utilities";
import { Task, TaskOptions } from "../Stores/Task.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Result } from "@sapphire/result";

@ApplyOptions<TaskOptions>({
    taskOptions: {
        name: "prometheusTask",
        data: {},
        options: {
            delay: Time.Second * 10
        }
    },
    enabled: process.env.PROMETHEUS_ENABLED === "true"
})

export class PrometheusTask extends Task {
    public async run(): Promise<void> {
        const previousTask = await this.container.gateway.redis.hget(Constants.PROMETHEUS_TASK, "lastRun");
        if (previousTask) return this.container.gateway.logger.warn("Possible dupe [prometheusTask] task, skipping...");

        const socketCounter = new this.container.gateway.prometheus.client.Gauge({
            name: "ws_ping",
            help: "Websocket ping",
            labelNames: ["shardId"]
        });

        const guildCounter = new this.container.gateway.prometheus.client.Counter({
            name: "guild_count",
            help: "Guild count"
        });

        const channelCounter = new this.container.gateway.prometheus.client.Counter({
            name: "channel_count",
            help: "Channel count"
        });

        const userCounter = new this.container.gateway.prometheus.client.Counter({
            name: "user_count",
            help: "User count"
        });

        const socketCollection = new RedisCollection<string, { shardId: string; ping: string }>({ redis: this.container.gateway.redis, hash: Constants.STATUSES_KEY });
        const gatewayStatuses = await socketCollection.valuesArray();

        const guildCollection = new RedisCollection<string, { member_count: number }>({ redis: this.container.gateway.redis, hash: Constants.GUILD_KEY });
        const guilds = await guildCollection.valuesArray();

        const channelCollection = new RedisCollection<string, { id: string }>({ redis: this.container.gateway.redis, hash: Constants.CHANNEL_KEY });
        const channels = await channelCollection.valuesArray();

        guildCounter.reset();
        guildCounter.inc(guilds.length);

        channelCounter.reset();
        channelCounter.inc(channels.length);

        userCounter.reset();
        userCounter.inc(guilds.reduce((acc, cur) => acc + cur.member_count, 0));

        socketCounter.reset();
        for (const status of gatewayStatuses) {
            socketCounter.set({ shardId: status.shardId }, Number(status.ping));
        }

        await this.container.gateway.redis.hset(Constants.PROMETHEUS_TASK, "lastRun", Date.now());
        await this.container.gateway.redis.expire(Constants.PROMETHEUS_TASK, Time.Second * 8);

        await this.container.gateway.tasks.sender.post({
            name: this.name,
            options: this.options.taskOptions.options,
            type: "add",
            data: this.options.taskOptions.data
        });
    }

    public override onLoad(): unknown {
        void Result.fromAsync(async () => {
            const previousTask = await this.container.gateway.redis.hget(Constants.PROMETHEUS_TASK, "lastRun");
            if (previousTask) return this.container.gateway.logger.warn("Possible dupe [prometheusTask] task, skipping...");

            await this.container.gateway.tasks.sender.post({
                name: this.name,
                options: this.options.taskOptions.options,
                type: "add",
                data: this.options.taskOptions.data
            });

            await this.container.gateway.redis.hset(Constants.PROMETHEUS_TASK, "lastRun", Date.now());
            await this.container.gateway.redis.expire(Constants.PROMETHEUS_TASK, Time.Second * 8);
        });
        this.container.gateway.tasks.receiver.on(this.name, this._run.bind(this));
        return super.onLoad();
    }
}
