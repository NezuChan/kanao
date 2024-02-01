import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { clientId, stateChannels, stateEmojis, stateMembers, stateRoles, stateUsers, stateVoices, statePresences } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildCreate
        });
    }

    public async run(payload: { data: GatewayGuildCreateDispatch; shardId: number }): Promise<void> {
        if (payload.data.d.unavailable) return;

        let alreadyExists = 0;
        if (stateMembers || stateUsers) {
            for (const member of payload.data.d.members) {
                if (stateUsers) {
                    const key = GenKey(RedisKey.USER_KEY, member.user!.id);
                    // Redis Exists return 1 if the key exists, 0 if it does not
                    alreadyExists += await this.store.redis.exists(key);
                    await this.store.redis.set(key, JSON.stringify(member.user));
                }

                if (stateMembers) {
                    await this.store.redis.set(GenKey(RedisKey.MEMBER_KEY, member.user!.id, payload.data.d.id), JSON.stringify(member));
                }
            }
            await this.store.redis.incrby(GenKey(RedisKey.USER_KEY, RedisKey.COUNT), payload.data.d.members.length - alreadyExists);
        }

        if (stateChannels) {
            for (const channel of payload.data.d.channels) {
                await this.store.redis.set(GenKey(RedisKey.CHANNEL_KEY, channel.id, payload.data.d.id), JSON.stringify(channel));
            }
        }

        if (stateRoles) {
            for (const role of payload.data.d.roles) {
                await this.store.redis.set(GenKey(RedisKey.ROLE_KEY, role.id, payload.data.d.id), JSON.stringify(role));
            }
        }

        if (stateVoices) {
            for (const voice of payload.data.d.voice_states) {
                await this.store.redis.set(GenKey(RedisKey.VOICE_KEY, voice.user_id, payload.data.d.id), JSON.stringify(voice));
            }
        }

        if (stateEmojis) {
            for (const emoji of payload.data.d.emojis) {
                if (emoji.id) {
                    await this.store.redis.set(GenKey(RedisKey.EMOJI_KEY, emoji.id, payload.data.d.id), JSON.stringify(emoji));
                }
            }
        }

        if (statePresences) {
            for (const presence of payload.data.d.presences) {
                await this.store.redis.set(GenKey(RedisKey.PRESENCE_KEY, presence.user.id, payload.data.d.id), JSON.stringify(presence));
            }
        }

        const key = GenKey(RedisKey.GUILD_KEY, payload.data.d.id);
        const exists = await this.store.redis.exists(key);
        await this.store.redis.set(key, JSON.stringify({
            ...payload.data.d,
            members: [],
            voice_states: [],
            emojis: [],
            presences: [],
            channels: [],
            stickers: [],
            soundboards: []
        }));

        if (exists === 0) await this.store.redis.incr(GenKey(RedisKey.GUILD_KEY, RedisKey.COUNT));

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
