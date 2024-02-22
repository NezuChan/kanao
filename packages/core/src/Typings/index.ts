export interface ClientOptions {
    token?: string;
    amqpUrl: string;
    shardIds?: number[] | { start: number; end: number; };
    shardCount: number;
    rest?: string;
    databaseUrl: string;
}
