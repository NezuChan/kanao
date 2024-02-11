import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayChannelCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { channels, guildsChannels } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateChannels } from "../../../config.js";

export class ChannelCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelCreate
        });
    }

    public async run(payload: { data: GatewayChannelCreateDispatch; shardId: number; }): Promise<void> {
        if (stateChannels) {
            await this.store.drizzle.insert(channels).values({
                id: payload.data.d.id,
                name: payload.data.d.name,
            }).onConflictDoUpdate({
                target: channels.id,
                set: {
                    name: payload.data.d.name
                }
            });

            if ("guild_id" in payload.data.d) {
                await this.store.drizzle.insert(guildsChannels).values({
                    id: payload.data.d.id,
                    guildId: payload.data.d.guild_id
                }).onConflictDoNothing({ target: guildsChannels.id });
            }
        }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
