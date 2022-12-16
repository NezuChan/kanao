import { Result } from "@sapphire/result";
import { GatewaySendPayload } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../../Stores/Listener.js";
import { ApplyOptions } from "../../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: "SocketRecevierListener",
    event: "send",
    emitter: container.gateway.amqp.receiver
}))

export class SocketRecevierListener extends Listener {
    public run(payload: Payload): void {
        switch (payload.data.op) {
            case 0:
                void Result.fromAsync(() => this.container.gateway.ws.send(payload.data.shard, payload.data.data));
                break;
            default:
                this.container.gateway.logger.warn(`Unknown OP Code: ${payload.data.op}`);
                break;
        }
    }
}

interface Payload {
    type: string;
    data: {
        op: number;
        shard: number;
        data: GatewaySendPayload;
    };
}
