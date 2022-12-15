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
        if ((/Got heartbeat ack after (?<ping>\d+)/).test(payload.message)) {
            const collection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.STATUSES_KEY });
            const ping = Number((/Got heartbeat ack after (?<ping>\d+)/).exec(payload.message)![1]);
            await collection.set(`${payload.shardId}`, { ping, shardId: payload.shardId });
        }

        this.container.gateway.logger.debug(payload);
    }
}
