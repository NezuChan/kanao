export interface ClientOptions {
    token?: string;
    amqpUrl: string;
    shardIds?: number[] | { start: number; end: number; };
    shardCount: number;
    rest?: string;
    queryTimeout?: number;
    instanceName: string;
}

export interface QueryResult {
    route: string;
    rows: unknown[];
    message: string;
}
