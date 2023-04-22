import { clientId } from "../config.js";

export function RoutingKey(shardId: number | string) {
    return `${clientId}:${shardId}`;
}

export function RoutingKeyToShardId(routingKey: string) {
    return parseInt(routingKey.split(":")[1]);
}
