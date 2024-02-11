import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayVoiceStateUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { memberRoles, members, users, voiceStates } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateMembers, stateUsers, stateVoices } from "../../../config.js";

export class VoiceStateUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.VoiceStateUpdate
        });
    }

    public async run(payload: { data: GatewayVoiceStateUpdateDispatch; shardId: number; }): Promise<void> {
        if (stateUsers && payload.data.d.member?.user !== undefined) {
            await this.store.drizzle.insert(users).values({
                id: payload.data.d.member.user.id,
                username: payload.data.d.member.user.username,
                discriminator: payload.data.d.member.user.discriminator ?? null,
                globalName: payload.data.d.member.user.global_name ?? null,
                avatar: payload.data.d.member.user.avatar ?? null,
                bot: payload.data.d.member.user.bot ?? false,
                flags: payload.data.d.member.user.flags
            }).onConflictDoNothing({ target: users.id });
        }

        if (stateMembers && payload.data.d.member !== undefined) {
            await this.store.drizzle.insert(members).values({
                id: payload.data.d.user_id,
                avatar: payload.data.d.member.avatar,
                flags: payload.data.d.member.flags
            }).onConflictDoNothing({ target: members.id });

            for (const role of payload.data.d.member.roles) {
                await this.store.drizzle.insert(memberRoles).values({
                    id: payload.data.d.user_id,
                    roleId: role
                }).onConflictDoNothing({ target: memberRoles.id });
            }
        }

        if (stateVoices) {
            await (payload.data.d.channel_id === null
                ? this.store.drizzle.delete(voiceStates).where(eq(voiceStates.guildId, payload.data.d.guild_id!))
                : this.store.drizzle.insert(voiceStates).values({
                    memberId: payload.data.d.user_id,
                    guildId: payload.data.d.guild_id,
                    channelId: payload.data.d.channel_id
                }).onConflictDoUpdate({
                    target: voiceStates.memberId,
                    set: {
                        channelId: payload.data.d.channel_id
                    }
                }));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
