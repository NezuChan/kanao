import { channels, channelsOverwrite } from "@nezuchan/kanao-schema";
import type { GatewayChannelDeleteDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { stateChannels } from "../../../config.js";
import { DispatchListener } from "../DispatchListener.js";

export class ChannelPintsUpdateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.ChannelDelete,
            enabled: stateChannels
        });
    }

    public async run(payload: { data: GatewayChannelDeleteDispatch; shardId: number; }): Promise<void> {
        await this.container.client.drizzle.delete(channels).where(eq(channels.id, payload.data.d.id));
        await this.container.client.drizzle.delete(channelsOverwrite).where(eq(channelsOverwrite.channelId, payload.data.d.id));

        await DispatchListener.dispatch(payload);
    }
}
