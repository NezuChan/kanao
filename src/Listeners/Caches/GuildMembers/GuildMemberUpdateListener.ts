import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildMemberUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { members, users } from "../../../Schema/index.js";
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
            await this.store.drizzle.update(users).set({
                username: payload.data.d.user.username,
                accentColor: payload.data.d.user.accent_color,
                avatar: payload.data.d.user.avatar,
                avatarDecoration: payload.data.d.user.avatar_decoration,
                banner: payload.data.d.user.banner,
                bot: payload.data.d.user.bot,
                discriminator: payload.data.d.user.discriminator,
                flags: payload.data.d.user.flags,
                globalName: payload.data.d.user.global_name,
                locale: payload.data.d.user.locale,
                mfaEnabled: payload.data.d.user.mfa_enabled,
                premiumType: payload.data.d.user.premium_type,
                publicFlags: payload.data.d.user.public_flags
            }).where(eq(users.id, payload.data.d.user.id));
        }

        if (stateMembers) {
            await this.store.drizzle.update(members).set({
                avatar: payload.data.d.avatar,
                communicationDisabledUntil: payload.data.d.premium_since,
                deaf: payload.data.d.deaf,
                flags: payload.data.d.flags,
                joinedAt: payload.data.d.joined_at,
                mute: payload.data.d.mute,
                nick: payload.data.d.nick,
                pending: payload.data.d.pending,
                premiumSince: payload.data.d.premium_since
            }).where(eq(members.id, payload.data.d.user.id));
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
