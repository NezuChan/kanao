import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { users } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayUserUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId } from "../../../config.js";

export class UserUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.UserUpdate
        });
    }

    public async run(payload: { data: GatewayUserUpdateDispatch; shardId: number; }): Promise<void> {
        await this.container.client.drizzle.insert(users).values({
            id: payload.data.d.id,
            username: payload.data.d.username,
            discriminator: payload.data.d.discriminator ?? null,
            globalName: payload.data.d.global_name ?? null,
            avatar: payload.data.d.avatar ?? null,
            bot: payload.data.d.bot ?? false,
            flags: payload.data.d.flags,
            accentColor: payload.data.d.accent_color,
            avatarDecoration: payload.data.d.avatar_decoration,
            banner: payload.data.d.banner,
            locale: payload.data.d.locale,
            mfaEnabled: payload.data.d.mfa_enabled,
            premiumType: payload.data.d.premium_type,
            publicFlags: payload.data.d.public_flags
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

        await this.container.client.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
