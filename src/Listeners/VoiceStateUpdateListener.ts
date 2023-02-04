/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayVoiceStateUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.VoiceStateUpdate,
    emitter: container.gateway
}))

export class VoiceStateUpdateListener extends Listener {
    public async run(payload: { data: GatewayVoiceStateUpdateDispatch }): Promise<void> {
        const old = await this.container.gateway.cache.states.get(`${payload.data.d.guild_id!}:${payload.data.d.user_id}`);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload, old }, { persistent: false });

        switch (payload.data.d.channel_id) {
            case null:
                await this.container.gateway.cache.states.delete(`${payload.data.d.guild_id!}:${payload.data.d.user_id}`);
                break;
            default:
                await this.container.gateway.cache.states.set(`${payload.data.d.guild_id!}:${payload.data.d.user_id}`, payload.data.d);
        }
    }
}
