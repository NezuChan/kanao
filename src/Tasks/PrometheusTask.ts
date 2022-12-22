/* eslint-disable @typescript-eslint/naming-convention */
import { RedisCollection } from "@nezuchan/redis-collection";
import { Time } from "@sapphire/time-utilities";
import { Task, TaskOptions } from "../Stores/Task.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<TaskOptions>({
    taskOptions: {
        name: "prometheusTask",
        data: {},
        options: {
            delay: Time.Second * 10
        }
    }
})

export class PrometheusTask extends Task {
    public async run(): Promise<void> {
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

        await this.container.gateway.tasks.sender.post({
            name: this.name,
            options: this.options.taskOptions.options,
            type: "add",
            data: this.options.taskOptions.data
        });
    }
}