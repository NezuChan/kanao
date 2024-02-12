import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayUserUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { users } from "../../../Schema/index.js";
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
        await this.store.drizzle.update(users).set({
            username: payload.data.d.username,
            discriminator: payload.data.d.discriminator,
            globalName: payload.data.d.global_name,
            accentColor: payload.data.d.accent_color,
            avatar: payload.data.d.avatar,
            avatarDecoration: payload.data.d.avatar_decoration,
            banner: payload.data.d.banner,
            bot: payload.data.d.bot,
            flags: payload.data.d.flags,
            id: payload.data.d.id,
            locale: payload.data.d.locale,
            mfaEnabled: payload.data.d.mfa_enabled,
            premiumType: payload.data.d.premium_type,
            publicFlags: payload.data.d.public_flags
        }).where(eq(users.id, payload.data.d.id));

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
