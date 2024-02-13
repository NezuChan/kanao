import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { members } from "@nezuchan/kanao-schema";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildMemberRemoveDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId } from "../../../config.js";

export class GuildMemberRemoveListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildMemberRemove
        });
    }

    public async run(payload: { data: GatewayGuildMemberRemoveDispatch; shardId: number; }): Promise<void> {
        await this.store.drizzle.delete(members).where(eq(members.id, payload.data.d.user.id));
        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
