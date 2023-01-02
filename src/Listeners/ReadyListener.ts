/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayReadyDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.Ready,
    emitter: container.gateway
}))

export class ReadyListener extends Listener {
    public async run(payload: { data: GatewayReadyDispatch }): Promise<void> {
        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, payload, { persistent: false });
        await this.container.gateway.redis.set(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.BOT_USER_KEY}` : Constants.BOT_USER_KEY, JSON.stringify(payload.data.d.user));
    }
}
