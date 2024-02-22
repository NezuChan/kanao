export interface ClientOptions {
    token?: string;
    amqpUrl: string;
    shardIds?: number[] | { start: number; end: number; };
    shardCount: number;
    databaseConnectionLimit?: number;
    rest?: string;
    databaseUrl: string;
}
