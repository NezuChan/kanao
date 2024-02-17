import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { memberRoles, members, users } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import { Result } from "@sapphire/result";
import type { GatewayGuildMemberAddDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
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
                flags: payload.data.d.user?.flags,
                accentColor: payload.data.d.user?.accent_color,
                avatarDecoration: payload.data.d.user?.avatar_decoration,
                banner: payload.data.d.user?.banner,
                locale: payload.data.d.user?.locale,
                mfaEnabled: payload.data.d.user?.mfa_enabled,
                premiumType: payload.data.d.user?.premium_type,
                publicFlags: payload.data.d.user?.public_flags
            }).onConflictDoNothing({ target: users.id });
        }

        await this.store.drizzle.insert(members).values({
            id: payload.data.d.user!.id,
            guildId: payload.data.d.guild_id,
            avatar: payload.data.d.avatar,
            flags: payload.data.d.flags,
            communicationDisabledUntil: payload.data.d.communication_disabled_until,
            deaf: payload.data.d.deaf,
            joinedAt: payload.data.d.joined_at,
            mute: payload.data.d.mute,
            nick: payload.data.d.nick,
            pending: payload.data.d.pending,
            premiumSince: payload.data.d.premium_since
        }).onConflictDoUpdate({
            target: members.id,
            set: {
                avatar: payload.data.d.avatar,
                flags: payload.data.d.flags,
                communicationDisabledUntil: payload.data.d.communication_disabled_until,
                deaf: payload.data.d.deaf,
                joinedAt: payload.data.d.joined_at,
                mute: payload.data.d.mute,
                nick: payload.data.d.nick,
                pending: payload.data.d.pending,
                premiumSince: payload.data.d.premium_since
            }
        });

        await Promise.all(payload.data.d.roles.map(async role => Result.fromAsync(async () => {
            await this.store.drizzle.insert(memberRoles).values({
                memberId: payload.data.d.user!.id,
                roleId: role,
                guildId: payload.data.d.guild_id
            }).onConflictDoNothing({ target: [memberRoles.memberId, memberRoles.roleId] });
        })));

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
