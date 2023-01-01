import { RedisCollection } from "@nezuchan/redis-collection";
import { Listener, ListenerOptions } from "../../Stores/Listener.js";
import { Constants } from "../../Utilities/Constants.js";
import { ApplyOptions } from "../../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: "SocketDebugListener",
    event: "debug",
    emitter: container.gateway.ws
}))

export class SocketDebugListener extends Listener {
    public async run(payload: { message: string; shardId: number }): Promise<void> {
        this.container.gateway.logger.debug(payload);

        if ((/Got heartbeat ack after (?<ping>\d+)/).test(payload.message)) {
            const collection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.STATUSES_KEY });
            const ping = Number((/Got heartbeat ack after (?<ping>\d+)/).exec(payload.message)![1]);
            await collection.set(`${payload.shardId}`, { ping, shardId: payload.shardId });
        }

        if (payload.shardId === 0 && payload.message.includes("Invalid session; will attempt to resume: false")) {
            await new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.GUILD_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.CHANNEL_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MESSAGE_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.ROLE_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.EMOJI_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MEMBER_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.PRESENCE_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.VOICE_KEY }).clear();
            this.container.gateway.logger.warn("Received invalid session, cleared all cache collections");
        }
    }
}
