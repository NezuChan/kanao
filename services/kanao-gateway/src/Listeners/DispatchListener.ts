import { Buffer } from "node:buffer";
import { WebSocketShardEvents } from "@discordjs/ws";
import type { GatewayDispatchPayload } from "discord-api-types/v10";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";
import { GatewayExchangeRoutes, RabbitMQ, RoutedQueue } from "../Utilities/amqp.js";
import { clientId } from "../config.js";

export class DispatchListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Dispatch
        });
    }

    public async run(payload: { shardId: number; data: { data: GatewayDispatchPayload; }; }): Promise<void> {
        const routing = new RoutedQueue(GatewayExchangeRoutes.RECEIVE, clientId);

        await this.store.amqp.publish(RabbitMQ.GATEWAY_EXCHANGE, routing.key, Buffer.from(JSON.stringify({ data: payload.data, shardId: payload.shardId })), { replyTo: clientId });
    }
}
