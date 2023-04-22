import { clientId } from "../config.js";

export function RoutingKey(id: number | string) {
    return `${clientId}:${id}`;
}

export function RoutingKeyToId(routingKey: string) {
    return parseInt(routingKey.split(":")[1]);
}
