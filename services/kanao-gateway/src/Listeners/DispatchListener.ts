import { Buffer } from "node:buffer";
import { WebSocketShardEvents } from "@discordjs/ws";
import { GatewayExchangeRoutes, RabbitMQ } from "@nezuchan/constants";
import { RoutedQueue } from "@nezuchan/utilities";
import type { GatewayDispatchPayload } from "discord-api-types/v10";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";
import { clientId } from "../config.js";

export class DispatchListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Dispatch
        });
    }

    public async run(payload: { shardId: number; data: { data: GatewayDispatchPayload; }; }): Promise<void> {
        const routing = new RoutedQueue(GatewayExchangeRoutes.RECEIVE, clientId);

        this.logger.trace({ shardId: payload.shardId, data: payload.data, routing }, "Dispatch event received");

        await this.store.amqp.publish(RabbitMQ.GATEWAY_EXCHANGE, routing.key, Buffer.from(JSON.stringify({ data: payload.data, shardId: payload.shardId })), { replyTo: clientId });
    }
}
