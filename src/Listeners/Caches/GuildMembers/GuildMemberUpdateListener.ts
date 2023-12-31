import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildMemberUpdateDispatch } from "discord-api-types/v10";
import { clientId, stateMembers, stateUsers } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class GuildMemberUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberUpdate
        });
    }

    public async run(payload: { data: GatewayGuildMemberUpdateDispatch; shardId: number }): Promise<void> {
        if (stateUsers) {
            await this.store.redis.set(GenKey(RedisKey.USER_KEY, payload.data.d.user.id), JSON.stringify(payload.data.d.user));
        }

        if (stateMembers) {
            await this.store.redis.set(GenKey(RedisKey.MEMBER_KEY, payload.data.d.user.id, payload.data.d.guild_id), JSON.stringify(payload.data.d));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
