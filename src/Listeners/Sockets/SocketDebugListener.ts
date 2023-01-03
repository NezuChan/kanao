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
            const collection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.STATUSES_KEY}` : Constants.STATUSES_KEY });
            const ping = Number((/Got heartbeat ack after (?<ping>\d+)/).exec(payload.message)![1]);
            await collection.set(`${payload.shardId}`, { ping, shardId: payload.shardId });
        }

        if (this.container.gateway.resetInvalidatedOnStart && payload.shardId === 0 && payload.message.includes("Invalid session; will attempt to resume: false")) {
            this.container.gateway.resetInvalidatedOnStart = false;
            await new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.GUILD_KEY}` : Constants.GUILD_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.CHANNEL_KEY}` : Constants.CHANNEL_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MESSAGE_KEY}` : Constants.MESSAGE_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.ROLE_KEY}` : Constants.ROLE_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.EMOJI_KEY}` : Constants.EMOJI_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MEMBER_KEY}` : Constants.MEMBER_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.PRESENCE_KEY}` : Constants.PRESENCE_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.VOICE_KEY}` : Constants.VOICE_KEY }).clear();
            await new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.STATUSES_KEY}` : Constants.STATUSES_KEY }).clear();
            this.container.gateway.logger.warn("Received invalid session, cleared all cache collections");
        }
    }
}
