import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayVoiceStateUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { voiceStates } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateVoices } from "../../../config.js";

export class VoiceStateUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.VoiceStateUpdate
        });
    }

    public async run(payload: { data: GatewayVoiceStateUpdateDispatch; shardId: number; }): Promise<void> {
        if (stateVoices) {
            await (payload.data.d.channel_id === null
                ? this.store.drizzle.delete(voiceStates).where(eq(voiceStates.guildId, payload.data.d.guild_id!))
                : this.store.drizzle.insert(voiceStates).values({
                    id: payload.data.d.channel_id,
                    guildId: payload.data.d.guild_id
                }).onConflictDoNothing({ target: voiceStates.id }));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data
        })));
    }
}
