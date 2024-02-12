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
                        flags: member.user?.flags,
                        accentColor: member.user?.accent_color,
                        avatarDecoration: member.user?.avatar_decoration,
                        banner: member.user?.banner,
                        locale: member.user?.locale,
                        mfaEnabled: member.user?.mfa_enabled,
                        premiumType: member.user?.premium_type,
                        publicFlags: member.user?.public_flags
                    }).onConflictDoNothing({ target: users.id });
                }

                if (stateMembers) {
                    await this.store.drizzle.insert(members).values({
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
                    }).onConflictDoNothing({ target: users.id });
                }
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
