import { CreateRedisOptions } from "@nezuchan/utilities";

export interface ClientOptions {
    token?: string;
    clientId?: string;
    amqpUrl: string;
    redis: CreateRedisOptions;
    shardIds?: number[] | { start: number; end: number };
    rest?: string;
}
