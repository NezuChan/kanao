/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayVoiceStateUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.VoiceStateUpdate,
    emitter: container.gateway
}))

export class VoiceStateUpdateListener extends Listener {
    public async run(payload: { data: GatewayVoiceStateUpdateDispatch }): Promise<void> {
        const voiceStateCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.VOICE_KEY}` : Constants.VOICE_KEY });

        const old = await voiceStateCollection.get(`${payload.data.d.guild_id!}:${payload.data.d.user_id}`);

        this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, { ...payload, old }, { persistent: false });

        switch (payload.data.d.channel_id) {
            case null:
                await voiceStateCollection.delete(`${payload.data.d.guild_id!}:${payload.data.d.user_id}`);
                break;
            default:
                await voiceStateCollection.set(`${payload.data.d.guild_id!}:${payload.data.d.user_id}`, payload.data.d);
        }
    }
}
