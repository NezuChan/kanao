import { WebSocketShardEvents } from "@discordjs/ws";
import type { GatewayReadyDispatch } from "discord-api-types/v10";
import { guilds } from "../Schema/index.js";
import type { ListenerContext } from "../Stores/Listener.js";
import { Listener } from "../Stores/Listener.js";

export class ReadyListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: WebSocketShardEvents.Ready
        });
    }

    public async run(payload: { data: { data: GatewayReadyDispatch["d"]; }; shardId: number; }): Promise<void> {
        this.logger.info(`Shard ${payload.shardId} is ready !`);
        if (payload.data.data.guilds.length > 0) {
            await this.store.drizzle.insert(guilds).values(payload.data.data.guilds.map(x => ({
                id: x.id,
                available: x.unavailable
            }))).onConflictDoNothing({ target: guilds.id });
        }
    }
}
