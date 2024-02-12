import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayMessageUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { messages } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateMessages } from "../../../config.js";

export class MessageUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageUpdate,
            enabled: stateMessages
        });
    }

    public async run(payload: { data: GatewayMessageUpdateDispatch; shardId: number; }): Promise<void> {
        if (stateMessages) {
            await this.store.drizzle.insert(messages).values({
                id: payload.data.d.id,
                channelId: payload.data.d.channel_id,
                content: payload.data.d.content,
                applicationId: payload.data.d.application_id,
                authorId: payload.data.d.author?.id,
                editedTimestamp: payload.data.d.edited_timestamp,
                flags: payload.data.d.flags,
                type: payload.data.d.type,
                mentionEveryone: payload.data.d.mention_everyone,
                pinned: payload.data.d.pinned,
                position: payload.data.d.position,
                timestamp: payload.data.d.timestamp,
                tts: payload.data.d.tts,
                webhookId: payload.data.d.webhook_id,
                nonce: payload.data.d.nonce?.toString()
            }).onConflictDoUpdate({
                target: messages.id,
                set: {
                    channelId: payload.data.d.channel_id,
                    content: payload.data.d.content,
                    applicationId: payload.data.d.application_id,
                    authorId: payload.data.d.author?.id,
                    editedTimestamp: payload.data.d.edited_timestamp,
                    flags: payload.data.d.flags,
                    type: payload.data.d.type,
                    mentionEveryone: payload.data.d.mention_everyone,
                    pinned: payload.data.d.pinned,
                    position: payload.data.d.position,
                    timestamp: payload.data.d.timestamp,
                    tts: payload.data.d.tts,
                    webhookId: payload.data.d.webhook_id,
                    nonce: payload.data.d.nonce?.toString()
                }
            });
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
