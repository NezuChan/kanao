/* eslint-disable class-methods-use-this */
import { RedisCollection } from "@nezuchan/redis-collection";
import { GatewayDispatchEvents, GatewayMessageUpdateDispatch } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../Stores/Listener.js";
import { Constants } from "../Utilities/Constants.js";
import { ApplyOptions } from "../Utilities/Decorators/ApplyOptions.js";
import { Util } from "../Utilities/Util.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: GatewayDispatchEvents.MessageUpdate,
    emitter: container.gateway
}))

export class MessageUpdateListener extends Listener {
    public async run(payload: { data: GatewayMessageUpdateDispatch }): Promise<void> {
        if (Util.optionalEnv("STATE_MESSAGE", "true")) {
            const messageCollection = new RedisCollection<string, GatewayMessageUpdateDispatch["d"]>({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MESSAGE_KEY}` : Constants.MESSAGE_KEY });
            const memberCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.MEMBER_KEY}` : Constants.MEMBER_KEY });
            const userCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: process.env.USE_ROUTING === "true" ? `${this.container.gateway.clientId}:${Constants.USER_KEY}` : Constants.USER_KEY });

            const message = await messageCollection.get(payload.data.d.id);
            if (message) {
                this.container.gateway.amqp.sender.publish(this.container.gateway.clientId, payload.data.t, {
                    ...payload,
                    old: message
                }, { persistent: false });

                if (Util.optionalEnv("STATE_MEMBER", "true")) await memberCollection.set(`${payload.data.d.guild_id!}:${payload.data.d.author!.id}`, payload.data.d.member);
                if (Util.optionalEnv("STATE_USER", "true")) await userCollection.set(payload.data.d.author!.id, payload.data.d.author);
                if (Util.optionalEnv("STATE_MESSAGE", "true")) await messageCollection.set(payload.data.d.id, payload.data.d as unknown as string);

                if (message.attachments) message.attachments = payload.data.d.attachments;
                if (message.content) message.content = payload.data.d.content;
                if (message.embeds) message.embeds = payload.data.d.embeds;
                if (message.flags) message.flags = payload.data.d.flags;
                if (message.mentions.length) message.mentions = payload.data.d.mentions;
                if (message.mention_everyone) message.mention_everyone = payload.data.d.mention_everyone;
                if (message.mention_roles) message.mention_roles = payload.data.d.mention_roles;
                if (message.pinned) message.pinned = payload.data.d.pinned;
                if (message.timestamp) message.timestamp = payload.data.d.timestamp;
                if (message.tts) message.tts = payload.data.d.tts;

                await messageCollection.set(payload.data.d.id, message as unknown as string);
            }
        }
    }
}
