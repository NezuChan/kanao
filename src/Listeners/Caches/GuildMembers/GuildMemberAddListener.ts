import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayGuildMemberAddDispatch, GatewayDispatchEvents } from "discord-api-types/v10";
import { clientId, stateMembers, stateUsers } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class GuildMemberAddListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberAdd
        });
    }

    public async run(payload: { data: GatewayGuildMemberAddDispatch; shardId: number }): Promise<void> {
        if (stateUsers) {
            const key = GenKey(RedisKey.USER_KEY, payload.data.d.user!.id);
            const exists = await this.store.redis.exists(key);
            await this.store.redis.set(key, JSON.stringify(payload.data.d.user));
            if (exists === 0) await this.store.redis.incr(GenKey(RedisKey.USER_KEY, RedisKey.COUNT));
        }

        if (stateMembers) {
            await this.store.redis.set(GenKey(RedisKey.MEMBER_KEY, payload.data.d.user!.id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
