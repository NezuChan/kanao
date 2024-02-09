/* eslint-disable require-atomic-updates */
import { Buffer } from "node:buffer";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { GenKey } from "../../../Utilities/GenKey.js";
import { clientId } from "../../../config.js";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildUpdate
        });
    }

    public async run(payload: { data: GatewayGuildUpdateDispatch; shardId: number; }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.GUILD_KEY, payload.data.d.id));
        const old_parsed = old === null ? {} : JSON.parse(old);

        payload.data.d.roles = [];
        payload.data.d.emojis = [];

        await this.store.redis.set(GenKey(RedisKey.GUILD_KEY, payload.data.d.id), JSON.stringify(payload.data.d));

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: {
                ...old_parsed
            }
        })));
    }
}
