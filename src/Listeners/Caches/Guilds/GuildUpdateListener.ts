import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildUpdateDispatch } from "discord-api-types/v10";
import { clientId, stateEmojis, stateRoles } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey, redisSScanStreamPromise } from "@nezuchan/utilities";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildUpdate
        });
    }

    public async run(payload: { data: GatewayGuildUpdateDispatch; shardId: number }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.GUILD_KEY, payload.data.d.id));
        const old_parsed = old ? JSON.parse(old) : {};

        const roles = await redisSScanStreamPromise(this.store.redis, GenKey(`${RedisKey.ROLE_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.id), "*", 1000);
        const emojis = await redisSScanStreamPromise(this.store.redis, GenKey(`${RedisKey.EMOJI_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.id), "*", 1000);

        if (stateRoles) {
            for (const role of payload.data.d.roles) {
                await this.store.redis.set(GenKey(`${RedisKey.ROLE_KEY}`, role.id, payload.data.d.id), JSON.stringify(role));
                await this.store.redis.sadd(GenKey(`${RedisKey.ROLE_KEY}${RedisKey.KEYS_SUFFIX}`, role.id, payload.data.d.id), GenKey(`${RedisKey.ROLE_KEY}`, role.id, payload.data.d.id));
            }
            payload.data.d.roles = [];
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

        await this.store.redis.sadd(GenKey(`${RedisKey.GUILD_KEY}${RedisKey.KEYS_SUFFIX}`, payload.data.d.id), GenKey(`${RedisKey.GUILD_KEY}`, payload.data.d.id));
        await this.store.redis.set(GenKey(`${RedisKey.GUILD_KEY}`, payload.data.d.id), JSON.stringify(payload.data.d));

        this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: {
                roles,
                emojis,
                ...old_parsed
            }
        })));
    }
}
