import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayMessageCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { memberRoles, members, messages, users } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateMembers, stateMessages, stateUsers } from "../../../config.js";

export class MessageCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.MessageCreate
        });
    }

    public async run(payload: { data: GatewayMessageCreateDispatch; shardId: number; }): Promise<void> {
        if (stateMessages) {
            await this.store.drizzle.insert(messages).values({
                id: payload.data.d.id,
                channelId: payload.data.d.channel_id,
                content: payload.data.d.content
            });
        }

        if (stateUsers) {
            await this.store.drizzle.insert(users).values({
                id: payload.data.d.id,
                username: payload.data.d.author.username,
                discriminator: payload.data.d.author.discriminator ?? null,
                globalName: payload.data.d.author.global_name ?? null,
                avatar: payload.data.d.author.avatar ?? null,
                bot: payload.data.d.author.bot ?? false,
                flags: payload.data.d.flags
            }).onConflictDoNothing({ target: users.id });
        }

        if (stateMembers && payload.data.d.member !== undefined) {
            await this.store.drizzle.insert(members).values({
                id: payload.data.d.id,
                avatar: payload.data.d.member.avatar,
                flags: payload.data.d.member.flags
            }).onConflictDoNothing({ target: members.id });

            for (const role of payload.data.d.member.roles) {
                await this.store.drizzle.insert(memberRoles).values({
                    id: payload.data.d.author.id,
                    roleId: role
                }).onConflictDoNothing({ target: memberRoles.id });
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
