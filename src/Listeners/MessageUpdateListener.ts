/* eslint-disable class-methods-use-this */
import { GatewayDispatchEvents, GatewayMessageUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";
import { Constants } from "../Utilities/Constants.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.MessageUpdate,
    emitter: container.gateway
}))

export class MessageUpdateListener extends Listener {
    public async run(payload: { data: GatewayMessageUpdateDispatch }): Promise<void> {
        if (Util.optionalEnv("STATE_MESSAGE", "true")) {
            const message = await this.container.gateway.cache.messages.get(payload.data.d.id);
            if (message) {
                this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
                    ...payload,
                    old: message
                }, { persistent: false });

                if (Util.optionalEnv("STATE_MEMBER", "true")) {
                    await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MESSAGE_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.MESSAGE_KEY}${Constants.KEYS_SUFFIX}`, `${payload.data.d.guild_id!}:${payload.data.d.author!.id}`);
                    await this.container.gateway.cache.members.set(`${payload.data.d.guild_id!}:${payload.data.d.author!.id}`, { ...payload.data.d.member, user: Util.optionalEnv<boolean>("STATE_USER", "true") ? { } : payload.data.d.author });
                }
                if (Util.optionalEnv("STATE_USER", "true")) {
                    await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.USER_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.USER_KEY}${Constants.KEYS_SUFFIX}`, payload.data.d.author!.id);
                    await this.container.gateway.cache.users.set(payload.data.d.author!.id, payload.data.d.author);
                }
                if (Util.optionalEnv("STATE_MESSAGE", "true")) {
                    await this.container.gateway.redis.sadd(process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MEMBER_KEY}${Constants.KEYS_SUFFIX}` : `${Constants.MEMBER_KEY}${Constants.KEYS_SUFFIX}`, payload.data.d.id);
                    await this.container.gateway.cache.members.set(payload.data.d.id, payload.data.d);
                }

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

                await this.container.gateway.cache.messages.set(payload.data.d.id, message);
            }
        }
    }
}
