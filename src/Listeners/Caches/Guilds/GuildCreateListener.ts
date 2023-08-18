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

        if (stateMembers || stateUsers) {
            for (const member of payload.data.d.members) {
                if (stateMembers) {
                    await this.store.redis.set(GenKey(RedisKey.MEMBER_KEY, member.user!.id, payload.data.d.id), JSON.stringify(member));
                    await this.store.redis.sadd(GenKey(`${RedisKey.MEMBER_KEY}${RedisKey.KEYS_SUFFIX}`, member.user!.id, payload.data.d.id), GenKey(RedisKey.CHANNEL_KEY, member.user!.id));
                }

                if (stateUsers) {
                    await this.store.redis.set(GenKey(RedisKey.USER_KEY, member.user!.id), JSON.stringify(member.user));
                    await this.store.redis.sadd(GenKey(`${RedisKey.USER_KEY}${RedisKey.KEYS_SUFFIX}`, member.user!.id), GenKey(RedisKey.USER_KEY, member.user!.id));
                }
            }
            payload.data.d.members = [];
        }

        if (stateChannels) {
            for (const channel of payload.data.d.channels) {
                await this.store.redis.set(GenKey(RedisKey.CHANNEL_KEY, channel.id, payload.data.d.id), JSON.stringify(channel));
                await this.store.redis.sadd(GenKey(`${RedisKey.CHANNEL_KEY}${RedisKey.KEYS_SUFFIX}`, channel.id, payload.data.d.id), GenKey(RedisKey.CHANNEL_KEY, channel.id, payload.data.d.id));
            }
            payload.data.d.channels = [];
        }

        if (stateRoles) {
            for (const role of payload.data.d.roles) {
                await this.store.redis.set(GenKey(`${RedisKey.ROLE_KEY}`, role.id, payload.data.d.id), JSON.stringify(role));
                await this.store.redis.sadd(GenKey(`${RedisKey.ROLE_KEY}${RedisKey.KEYS_SUFFIX}`, role.id, payload.data.d.id), GenKey(`${RedisKey.ROLE_KEY}`, role.id, payload.data.d.id));
            }
            payload.data.d.roles = [];
        }

        if (stateVoices) {
            for (const voice of payload.data.d.voice_states) {
                await this.store.redis.set(GenKey(RedisKey.ROLE_KEY, voice.user_id, payload.data.d.id), JSON.stringify(voice));
                await this.store.redis.sadd(GenKey(`${RedisKey.ROLE_KEY}${RedisKey.KEYS_SUFFIX}`, voice.user_id, payload.data.d.id), GenKey(`${RedisKey.VOICE_KEY}`, voice.user_id, payload.data.d.id));
            }
            payload.data.d.voice_states = [];
        }

        if (stateEmojis) {
            for (const emoji of payload.data.d.emojis) {
                if (emoji.id) {
                    await this.store.redis.set(GenKey(`${RedisKey.EMOJI_KEY}`, emoji.id, payload.data.d.id), JSON.stringify(emoji));
                    await this.store.redis.sadd(GenKey(`${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}`, emoji.id, payload.data.d.id), GenKey(`${RedisKey.EMOJI_KEY}`, emoji.id, payload.data.d.id));
                }
            }
            payload.data.d.emojis = [];
        }

        if (statePresences) {
            for (const presence of payload.data.d.presences) {
                await this.store.redis.set(GenKey(`${RedisKey.PRESENCE_KEY}`, presence.user.id, payload.data.d.id), JSON.stringify(presence));
                await this.store.redis.sadd(GenKey(`${RedisKey.PRESENCE_KEY}${RedisKey.KEYS_SUFFIX}`, presence.user.id, payload.data.d.id), GenKey(`${RedisKey.PRESENCE_KEY}`, presence.user.id, payload.data.d.id));
            }
            payload.data.d.presences = [];
        }

        await this.store.redis.sadd(GenKey(`${RedisKey.GUILD_KEY}${RedisKey.KEYS_SUFFIX}`), GenKey(`${RedisKey.GUILD_KEY}`, payload.data.d.id));
        await this.store.redis.set(GenKey(`${RedisKey.GUILD_KEY}`, payload.data.d.id), JSON.stringify(payload.data.d));

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
