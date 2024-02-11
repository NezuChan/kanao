import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildMembersChunkDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { members, users } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateMembers, stateUsers } from "../../../config.js";

export class GuildMembersChunkListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMembersChunk
        });
    }

    public async run(payload: { data: GatewayGuildMembersChunkDispatch; shardId: number; }): Promise<void> {
        if (stateMembers || stateUsers) {
            for (const member of payload.data.d.members) {
                if (stateUsers) {
                    await this.store.drizzle.insert(users).values({
                        id: member.user!.id,
                        username: member.user!.username,
                        discriminator: member.user?.discriminator ?? null,
                        globalName: member.user?.global_name ?? null,
                        avatar: member.user?.avatar ?? null,
                        bot: member.user?.bot ?? false,
                        flags: member.user?.flags
                    }).onConflictDoNothing({ target: users.id });
                }

                if (stateMembers) {
                    await this.store.drizzle.insert(members).values({
                        id: member.user!.id
                    }).onConflictDoNothing({ target: users.id });
                }
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
