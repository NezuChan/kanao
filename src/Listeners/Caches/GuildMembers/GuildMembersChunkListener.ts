import { Listener, ListenerContext } from "../../../Stores/Listener.js";
import { GatewayDispatchEvents, GatewayGuildMembersChunkDispatch } from "discord-api-types/v10";
import { clientId, stateMembers, stateUsers } from "../../../config.js";
import { RabbitMQ, RedisKey } from "@nezuchan/constants";
import { GenKey } from "../../../Utilities/GenKey.js";
import { RoutingKey } from "@nezuchan/utilities";

export class GuildMembersChunkListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMembersChunk
        });
    }

    public async run(payload: { data: GatewayGuildMembersChunkDispatch; shardId: number }): Promise<void> {
        if (stateMembers || stateUsers) {
            for (const member of payload.data.d.members) {
                if (stateUsers) {
                    await this.store.redis.set(GenKey(RedisKey.USER_KEY, member.user!.id), JSON.stringify(member.user));
                }

                if (stateMembers) {
                    await this.store.redis.set(GenKey(RedisKey.MEMBER_KEY, member.user!.id, payload.data.d.guild_id), JSON.stringify(member));
                }
            }
            await this.store.redis.incrby(GenKey(RedisKey.USER_KEY, RedisKey.COUNT), payload.data.d.members.length);
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
