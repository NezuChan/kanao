import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { APIMessage, GatewayDispatchEvents, GatewayMessageUpdateDispatch } from "discord-api-types/v10";
import { stateMessages } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "../../../Utilities/RoutingKey.js";

export class MessageUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageUpdate,
            enabled: stateMessages
        });
    }

    public async run(payload: { data: GatewayMessageUpdateDispatch; shardId: number }): Promise<void> {
        const raw_message = await this.store.redis.get(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));
        if (raw_message) {
            const message = JSON.parse(raw_message) as APIMessage;

            if (message.attachments.length) message.attachments = payload.data.d.attachments ?? [];
            if (message.content) message.content = payload.data.d.content ?? "";
            if (message.embeds.length) message.embeds = payload.data.d.embeds ?? [];
            if (message.flags) message.flags = payload.data.d.flags;
            if (message.mentions.length) message.mentions = payload.data.d.mentions;
            if (message.mention_everyone) message.mention_everyone = payload.data.d.mention_everyone ?? false;
            if (message.mention_roles.length) message.mention_roles = payload.data.d.mention_roles ?? [];
            if (message.pinned) message.pinned = payload.data.d.pinned ?? false;
            if (message.timestamp) message.timestamp = payload.data.d.timestamp ?? new Date().toString();
            if (message.tts) message.tts = payload.data.d.tts ?? false;

            await this.store.redis.set(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id), JSON.stringify(message));
        } else {
            await this.store.redis.set(GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
            await this.store.redis.sadd(GenKey(`${RedisKey.MESSAGE_KEY}${RedisKey.KEYS_SUFFIX}`, undefined, payload.data.d.guild_id), GenKey(RedisKey.MESSAGE_KEY, payload.data.d.id, payload.data.d.guild_id));
        }

        this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: raw_message ? JSON.parse(raw_message) : null
        })));
    }
}
