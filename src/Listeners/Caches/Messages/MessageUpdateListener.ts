/* eslint-disable unicorn/prefer-ternary */
import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayMessageUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
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
        const message = await this.store.drizzle.query.messages.findFirst({
            where: () => eq(messages.id, payload.data.d.id)
        });

        if (stateMessages) {
            if (message === null) {
                await this.store.drizzle.insert(messages).values({
                    id: payload.data.d.id,
                    channelId: payload.data.d.channel_id
                });
            } else {
                // if (message.attachments.length > 0) message.attachments = payload.data.d.attachments ?? [];
                // if (message.content) message.content = payload.data.d.content ?? "";
                // if (message.embeds.length > 0) message.embeds = payload.data.d.embeds ?? [];
                // if (message.flags !== undefined) message.flags = payload.data.d.flags;
                // if (message.mentions.length > 0) message.mentions = payload.data.d.mentions;
                // if (message.mention_everyone) message.mention_everyone = payload.data.d.mention_everyone ?? false;
                // if (message.mention_roles.length > 0) message.mention_roles = payload.data.d.mention_roles ?? [];
                // if (message.pinned) message.pinned = payload.data.d.pinned ?? false;
                // if (message.timestamp) message.timestamp = payload.data.d.timestamp ?? new Date().toString();
                // if (message.tts) message.tts = payload.data.d.tts ?? false;

                await this.store.drizzle.update(messages).set({
                    channelId: payload.data.d.channel_id,
                    content: payload.data.d.content
                }).where(eq(messages.id, payload.data.d.id));
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data
        })));
    }
}
