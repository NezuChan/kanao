import type { CreateRedisOptions } from "@nezuchan/utilities";

export type ClientOptions = {
    token?: string;
    clientId?: string;
    amqpUrl: string;
    redis: CreateRedisOptions;
    shardIds?: number[] | { start: number; end: number; };
    rest?: string;
};
