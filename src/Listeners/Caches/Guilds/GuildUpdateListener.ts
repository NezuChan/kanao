import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildUpdateDispatch } from "discord-api-types/v10";
import { clientId, guildUpdateDontFetchOlds, redisScanCount, stateEmojis, stateRoles } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey, redisScan } from "@nezuchan/utilities";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildUpdate
        });
    }

    public async run(payload: { data: GatewayGuildUpdateDispatch; shardId: number }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.GUILD_KEY, payload.data.d.id));
        const old_parsed = old ? JSON.parse(old) : {};

        let roles: string[] = [];
        let emojis: string[] = [];

        // TODO: Figure out if it's necessary to fetch old roles/emojis
        if (stateRoles) {
            if (!guildUpdateDontFetchOlds) {
                roles = await redisScan(this.store.redis, GenKey(RedisKey.ROLE_KEY, payload.data.d.id), redisScanCount);
            }
            for (const role of payload.data.d.roles) {
                await this.store.redis.set(GenKey(RedisKey.ROLE_KEY, role.id, payload.data.d.id), JSON.stringify(role));
            }
            payload.data.d.roles = [];
        }

        if (stateEmojis) {
            if (!guildUpdateDontFetchOlds) {
                emojis = await redisScan(this.store.redis, GenKey(RedisKey.EMOJI_KEY, payload.data.d.id), redisScanCount);
            }
            for (const emoji of payload.data.d.emojis) {
                if (emoji.id) {
                    await this.store.redis.set(GenKey(RedisKey.EMOJI_KEY, emoji.id, payload.data.d.id), JSON.stringify(emoji));
                }
            }
            payload.data.d.emojis = [];
        }

        await this.store.redis.set(GenKey(RedisKey.GUILD_KEY, payload.data.d.id), JSON.stringify(payload.data.d));

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: {
                roles,
                emojis,
                ...old_parsed
            }
        })));
    }
}
