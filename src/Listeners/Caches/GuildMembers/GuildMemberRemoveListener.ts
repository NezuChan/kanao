import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildMemberRemoveDispatch } from "discord-api-types/v10";
import { clientId, stateMembers } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class GuildMemberRemoveListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberRemove
        });
    }

    public async run(payload: { data: GatewayGuildMemberRemoveDispatch; shardId: number }): Promise<void> {
        const old = await this.store.redis.get(GenKey(RedisKey.MEMBER_KEY, payload.data.d.user.id, payload.data.d.guild_id));

        if (stateMembers) {
            await this.store.redis.unlink(GenKey(RedisKey.MEMBER_KEY, payload.data.d.user.id, payload.data.d.guild_id));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify({
            ...payload.data,
            old: old ? JSON.parse(old) : null
        })));
    }
}
