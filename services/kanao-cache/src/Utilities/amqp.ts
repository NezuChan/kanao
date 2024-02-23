export enum RabbitMQ {
    GATEWAY_EXCHANGE = "kanao-gateway"
}

export enum GatewayExchangeRoutes {
    DISPATCH = "dispatch",
    RECEIVE = "receive",
    CACHE = "cache",
    SEND = "send"
}

export class ShardedRoutedQueue {
    public key: string;
    public queue: string;
    public constructor(private readonly routedQueue: RoutedQueue, shardId: string, appId?: string) {
        this.key = this.routedQueue.key.replace("*", shardId);
        this.queue = appId ? `${this.routedQueue.queue}:${shardId}` : this.routedQueue.queue;
    }

    public static routingKeyToShardId(routingKey: string): number {
        return Number(routingKey.split(".")[2]);
    }
}

export class RoutedQueue {
    public key: string;
    public queue: string;
    public constructor(private readonly route: GatewayExchangeRoutes, clientId: string, private readonly appId?: string) {
        this.key = `${route}.${clientId}.*`;
        this.queue = appId ? `${appId}:${clientId}` : "";
    }

    public shard(id: number | string): ShardedRoutedQueue {
        return new ShardedRoutedQueue(this, id.toString(), this.appId);
    }
}
