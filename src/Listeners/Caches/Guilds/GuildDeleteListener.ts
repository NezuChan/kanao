/* eslint-disable no-await-in-loop */
import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey, redisScan } from "@nezuchan/utilities";
import type { GatewayGuildDeleteDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId, redisScanCount } from "../../../config.js";

export class GuildDeleteListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildDelete
        });
    }

    public async run(payload: { data: GatewayGuildDeleteDispatch; shardId: number; }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.GUILD_KEY, payload.data.d.id));
        const old_parsed = old === null ? {} : JSON.parse(old);

        const roles = await redisScan(this.store.redis, GenKey(RedisKey.ROLE_KEY, payload.data.d.id), redisScanCount);
        const channels = await redisScan(this.store.redis, GenKey(RedisKey.CHANNEL_KEY, payload.data.d.id), redisScanCount);
        const members = await redisScan(this.store.redis, GenKey(RedisKey.MEMBER_KEY, payload.data.d.id), redisScanCount);
        const emojis = await redisScan(this.store.redis, GenKey(RedisKey.EMOJI_KEY, payload.data.d.id), redisScanCount);
        const presences = await redisScan(this.store.redis, GenKey(RedisKey.PRESENCE_KEY, payload.data.d.id), redisScanCount);
        const voiceStates = await redisScan(this.store.redis, GenKey(RedisKey.VOICE_KEY, payload.data.d.id), redisScanCount);

        for (const role of roles) await this.store.redis.unlink(role);
        for (const channel of channels) await this.store.redis.unlink(channel);
        for (const member of members) await this.store.redis.unlink(member);
        for (const emoji of emojis) await this.store.redis.unlink(emoji);
        for (const presence of presences) await this.store.redis.unlink(presence);
        for (const voiceState of voiceStates) await this.store.redis.unlink(voiceState);

        await this.store.redis.unlink(GenKey(RedisKey.GUILD_KEY, payload.data.d.id));
        await this.store.redis.decr(GenKey(RedisKey.GUILD_KEY, RedisKey.COUNT));
        await this.store.redis.decrby(GenKey(RedisKey.CHANNEL_KEY, RedisKey.COUNT), channels.length);

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: {
                roles,
                channels,
                members,
                emojis,
                presences,
                voiceStates,
                ...old_parsed
            }
        })));
    }
}
