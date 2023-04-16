import { Listener, ListenerContext } from "../../Stores/Listener.js";
import { GatewayChannelCreateDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { clientId, stateChannels } from "../../config.js";
import { RedisKey } from "@nezuchan/constants";

export class ChannelCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelCreate,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelCreateDispatch }): Promise<void> {
        if ("guild_id" in payload.data.d && payload.data.d.guild_id) {
            await this.store.redis.set(`${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.guild_id}:${payload.data.d.id}`, JSON.stringify(payload.data.d));
            await this.store.redis.sadd(`${clientId}:${RedisKey.CHANNEL_KEY}${RedisKey.KEYS_SUFFIX}:${payload.data.d.guild_id}`, `${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.guild_id}:${payload.data.d.id}`);
        } else {
            await this.store.redis.set(`${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.id}`, JSON.stringify(payload.data.d));
            await this.store.redis.sadd(`${clientId}:${RedisKey.CHANNEL_KEY}${RedisKey.KEYS_SUFFIX}`, `${clientId}:${RedisKey.CHANNEL_KEY}:${payload.data.d.id}`);
        }
    }
}
