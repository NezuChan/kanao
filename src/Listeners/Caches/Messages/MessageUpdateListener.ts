import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { APIMessage, GatewayMessageUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, stateMessages } from "../../../config.js";

export class MessageUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageUpdate,
            enabled: stateMessages
        });
    }

    public async run(payload: { data: GatewayMessageUpdateDispatch; shardId: number; }): Promise<void> {
        const raw_message = await this.store.redis.get(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));

        if (stateMessages) {
            if (raw_message === null) {
                await this.store.redis.set(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
            } else {
                const message = JSON.parse(raw_message) as APIMessage;

                if (message.attachments.length > 0) message.attachments = payload.data.d.attachments ?? [];
                if (message.content) message.content = payload.data.d.content ?? "";
                if (message.embeds.length > 0) message.embeds = payload.data.d.embeds ?? [];
                if (message.flags !== undefined) message.flags = payload.data.d.flags;
                if (message.mentions.length > 0) message.mentions = payload.data.d.mentions;
                if (message.mention_everyone) message.mention_everyone = payload.data.d.mention_everyone ?? false;
                if (message.mention_roles.length > 0) message.mention_roles = payload.data.d.mention_roles ?? [];
                if (message.pinned) message.pinned = payload.data.d.pinned ?? false;
                if (message.timestamp) message.timestamp = payload.data.d.timestamp ?? new Date().toString();
                if (message.tts) message.tts = payload.data.d.tts ?? false;

                await this.store.redis.set(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id), JSON.stringify(message));
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: raw_message === null ? null : JSON.parse(raw_message)
        })));
    }
}
