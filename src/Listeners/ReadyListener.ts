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
        await this.container.gateway.redis.set(Constants.BOT_USER_KEY, JSON.stringify(payload.data.d.user));
    }
}
