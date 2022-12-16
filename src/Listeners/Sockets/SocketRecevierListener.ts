import { GatewaySendPayload } from "discord-api-types/v10";
import { Listener, ListenerOptions } from "../../Stores/Listener.js";
import { ApplyOptions } from "../../Utilities/Decorators/ApplyOptions.js";

@ApplyOptions<ListenerOptions>(({ container }) => ({
    name: "SocketRecevierListener",
    event: "send",
    emitter: container.gateway.amqp.receiver
}))

export class SocketRecevierListener extends Listener {
    public async run(payload: Payload): Promise<void> {
        switch (payload.data.op) {
            case 0:
                await this.container.gateway.ws.send(payload.data.shard, payload.data.data);
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
