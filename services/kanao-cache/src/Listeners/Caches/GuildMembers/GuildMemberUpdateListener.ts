import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { memberRoles, members, users } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildMemberUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { and, eq, sql } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateMembers, stateUsers } from "../../../config.js";

export class GuildMemberUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberUpdate
        });
    }

    public async run(payload: { data: GatewayGuildMemberUpdateDispatch; shardId: number; }): Promise<void> {
        if (stateUsers) {
            await this.container.client.drizzle.insert(users).values({
                ...payload.data.d.user,
                globalName: payload.data.d.user.global_name ?? null,
                premiumType: payload.data.d.user.premium_type,
                publicFlags: payload.data.d.user.public_flags
            }).onConflictDoUpdate({
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
            await this.container.client.drizzle.insert(members).values({
                id: payload.data.d.user.id,
                avatar: payload.data.d.avatar,
                communicationDisabledUntil: payload.data.d.premium_since,
                deaf: payload.data.d.deaf,
                flags: payload.data.d.flags,
                joinedAt: payload.data.d.joined_at,
                mute: payload.data.d.mute,
                nick: payload.data.d.nick,
                pending: payload.data.d.pending,
                premiumSince: payload.data.d.premium_since
            }).onConflictDoUpdate({
                target: members.id,
                set: {
                    avatar: sql`EXCLUDED.avatar`,
                    flags: sql`EXCLUDED.flags`,
                    communicationDisabledUntil: sql`EXCLUDED.communication_disabled_until`,
                    deaf: sql`EXCLUDED.deaf`,
                    joinedAt: sql`EXCLUDED.joined_at`,
                    mute: sql`EXCLUDED.mute`,
                    nick: sql`EXCLUDED.nick`,
                    pending: sql`EXCLUDED.pending`,
                    premiumSince: sql`EXCLUDED.premium_since`
                }
            });

            await this.container.client.drizzle.delete(memberRoles).where(and(eq(memberRoles.memberId, payload.data.d.user.id), eq(memberRoles.guildId, payload.data.d.guild_id)));

            if (payload.data.d.roles.length > 0) {
                await this.container.client.drizzle.insert(memberRoles).values(payload.data.d.roles.map(role => ({
                    memberId: payload.data.d.user.id,
                    roleId: role,
                    guildId: payload.data.d.guild_id
                }))).onConflictDoNothing({ target: [memberRoles.memberId, memberRoles.roleId] });
            }
        }

        await this.container.client.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
