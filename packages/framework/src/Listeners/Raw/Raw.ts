import { Events } from "@nezuchan/core";
import type { LoaderPieceContext } from "@sapphire/pieces";
import type { GatewayDispatchPayload } from "discord-api-types/v10";
import { Listener } from "../../Stores/Listener.js";

export class InteractionCreate extends Listener {
    public constructor(context: LoaderPieceContext) {
        super(context, {
            name: Events.RAW
        });
    }

    public run(payload: GatewayDispatchPayload): void {
        this.container.client.emit(payload.t, payload.d);
    }
}
