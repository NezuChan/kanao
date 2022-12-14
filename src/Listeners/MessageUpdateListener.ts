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
    public async run(payload: GatewayMessageUpdateDispatch): Promise<void> {
        if (Util.optionalEnv("STATE_MESSAGE", "true")) {
            const messageCollection = new RedisCollection<string, GatewayMessageUpdateDispatch["d"]>({ redis: this.container.gateway.redis, hash: Constants.MESSAGE_KEY });
            const memberCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.MEMBER_KEY });
            const userCollection = new RedisCollection({ redis: this.container.gateway.redis, hash: Constants.USER_KEY });

            const message = await messageCollection.get(payload.d.id);
            if (message) {
                if (Util.optionalEnv("STATE_MEMBER", "true")) await memberCollection.set(payload.d.author!.id, payload.d.member);
                if (Util.optionalEnv("STATE_USER", "true")) await userCollection.set(payload.d.author!.id, payload.d.author);
                if (Util.optionalEnv("STATE_MESSAGE", "true")) await messageCollection.set(payload.d.id, payload.d as unknown as string);

                if (message.attachments) message.attachments = payload.d.attachments;
                if (message.content) message.content = payload.d.content;
                if (message.embeds) message.embeds = payload.d.embeds;
                if (message.flags) message.flags = payload.d.flags;
                if (message.mentions.length) message.mentions = payload.d.mentions;
                if (message.mention_everyone) message.mention_everyone = payload.d.mention_everyone;
                if (message.mention_roles) message.mention_roles = payload.d.mention_roles;
                if (message.pinned) message.pinned = payload.d.pinned;
                if (message.timestamp) message.timestamp = payload.d.timestamp;
                if (message.tts) message.tts = payload.d.tts;

                await messageCollection.set(payload.d.id, message as unknown as string);
            }
        }
    }
}
