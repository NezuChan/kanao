import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildMemberAddDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { memberRoles, members, users } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateUsers } from "../../../config.js";

export class GuildMemberAddListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberAdd
        });
    }

    public async run(payload: { data: GatewayGuildMemberAddDispatch; shardId: number; }): Promise<void> {
        if (stateUsers) {
            await this.store.drizzle.insert(users).values({
                id: payload.data.d.user!.id,
                username: payload.data.d.user!.username,
                discriminator: payload.data.d.user?.discriminator ?? null,
                globalName: payload.data.d.user?.global_name ?? null,
                avatar: payload.data.d.user?.avatar ?? null,
                bot: payload.data.d.user?.bot ?? false,
                flags: payload.data.d.user?.flags
            }).onConflictDoNothing({ target: users.id });
        }

        const member = await this.store.drizzle.query.members.findFirst({
            where: (m, { eq }) => eq(m.id, payload.data.d.user!.id),
            columns: {
                id: true
            }
        }) ?? await this.store.drizzle.insert(members).values({
            id: payload.data.d.user!.id,
            avatar: payload.data.d.avatar,
            flags: payload.data.d.flags
        }).onConflictDoNothing({ target: members.id })
            .returning({ id: members.id })
            .then(x => x[0]);

        for (const role of payload.data.d.roles) {
            await this.store.drizzle.insert(memberRoles).values({
                id: member!.id,
                roleId: role
            }).onConflictDoNothing({ target: memberRoles.id });
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
