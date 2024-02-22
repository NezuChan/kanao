import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { memberRoles, members, users } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import { chunk } from "@sapphire/utilities";
import type { GatewayGuildMembersChunkDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
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
        const chunks = chunk(payload.data.d.members, 1_000);

        for (const memberChunk of chunks) {
            if (stateUsers) {
                await this.container.client.drizzle.insert(users)
                    .values(
                        memberChunk.map(member => ({
                            id: member.user!.id,
                            username: member.user!.username,
                            discriminator: member.user?.discriminator ?? null,
                            globalName: member.user?.global_name ?? null,
                            avatar: member.user?.avatar ?? null,
                            bot: member.user?.bot ?? false,
                            flags: member.user?.flags,
                            accentColor: member.user?.accent_color,
                            avatarDecoration: member.user?.avatar_decoration,
                            banner: member.user?.banner,
                            locale: member.user?.locale,
                            mfaEnabled: member.user?.mfa_enabled,
                            premiumType: member.user?.premium_type,
                            publicFlags: member.user?.public_flags
                        }))
                    ).onConflictDoUpdate({
                        target: users.id,
                        set: {
                            username: sql`EXCLUDED.username`,
                            discriminator: sql`EXCLUDED.discriminator`,
                            globalName: sql`EXCLUDED.global_name`,
                            avatar: sql`EXCLUDED.avatar`,
                            bot: sql`EXCLUDED.bot`,
                            flags: sql`EXCLUDED.flags`,
                            accentColor: sql`EXCLUDED.accent_color`,
                            avatarDecoration: sql`EXCLUDED.avatar_decoration`,
                            banner: sql`EXCLUDED.banner`,
                            locale: sql`EXCLUDED.locale`,
                            mfaEnabled: sql`EXCLUDED.mfa_enabled`,
                            premiumType: sql`EXCLUDED.premium_type`,
                            publicFlags: sql`EXCLUDED.public_flags`
                        }
                    });
            }

            if (stateMembers) {
                await this.container.client.drizzle.insert(members)
                    .values(
                        memberChunk.map(member => ({
                            id: member.user!.id,
                            avatar: member.avatar,
                            communicationDisabledUntil: member.premium_since,
                            deaf: member.deaf,
                            flags: member.flags,
                            joinedAt: member.joined_at,
                            mute: member.mute,
                            nick: member.nick,
                            pending: member.pending,
                            premiumSince: member.premium_since
                        }))
                    ).onConflictDoUpdate({
                        target: members.id,
                        set: {
                            avatar: sql`EXCLUDED.avatar`,
                            communicationDisabledUntil: sql`EXCLUDED.premium_since`,
                            deaf: sql`EXCLUDED.deaf`,
                            flags: sql`EXCLUDED.flags`,
                            joinedAt: sql`EXCLUDED.joined_at`,
                            mute: sql`EXCLUDED.mute`,
                            nick: sql`EXCLUDED.nick`,
                            pending: sql`EXCLUDED.pending`,
                            premiumSince: sql`EXCLUDED.premium_since`
                        }
                    });

                for (const member of memberChunk) {
                    if (member.roles.length > 0) {
                        await this.container.client.drizzle.insert(memberRoles)
                            .values(member.roles.map(role => ({
                                memberId: member.user!.id,
                                roleId: role,
                                guildId: payload.data.d.guild_id
                            }))).onConflictDoNothing({ target: [memberRoles.memberId, memberRoles.roleId] });
                    }
                }
            }
        }

        await this.container.client.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}