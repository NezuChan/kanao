import { PieceContext } from "@sapphire/pieces";
import { Listener } from "../../Stores/Listener.js";
import { GatewayDispatchPayload } from "discord-api-types/v10";
import { Events } from "@nezuchan/core";

export class InteractionCreate extends Listener {
    public constructor(context: PieceContext) {
        super(context, {
            name: Events.RAW
        });
    }

    public run(payload: GatewayDispatchPayload): void {
        this.container.client.emit(payload.t, payload.d);
    }
}
