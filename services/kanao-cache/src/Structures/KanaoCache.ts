import { Buffer } from "node:buffer";
import EventEmitter from "node:events";
import { GatewayExchangeRoutes, RabbitMQ } from "@nezuchan/constants";
import * as schema from "@nezuchan/kanao-schema";
import { RoutedQueue, createAmqpChannel } from "@nezuchan/utilities";
import { StoreRegistry, container } from "@sapphire/pieces";
import type { Channel } from "amqplib";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { ListenerStore } from "../Stores/ListenerStore.js";
import { createLogger } from "../Utilities/Logger.js";
import { clientId, storeLogs, lokiHost, databaseUrl, amqp, databaseConnectionLimit } from "../config.js";

export class KanaoCache extends EventEmitter {
    public cacheQueue = createAmqpChannel(amqp, {
        setup: async (channel: Channel) => this.setupCacheQueue(channel)
    });

    public rpcQueue = createAmqpChannel(amqp, {
        setup: async (channel: Channel) => this.setupRpc(channel)
    });

    public logger = createLogger("kanao-cache", clientId, storeLogs, lokiHost);
    public pgClient = new pg.Pool({ connectionString: databaseUrl, max: databaseConnectionLimit });

    public drizzle = drizzle(this.pgClient, { schema });

    public stores = new StoreRegistry();

    public async connect(): Promise<void> {
        container.client = this;
        await this.pgClient.connect();
        this.pgClient.on("error", e => this.logger.error(e, "Postgres emitted error"));

        this.stores.register(new ListenerStore());

        await this.stores.load();
    }

    public async setupCacheQueue(channel: Channel): Promise<void> {
        await channel.assertExchange(RabbitMQ.GATEWAY_EXCHANGE, "topic", { durable: false });

        // Used for receiving receive events from the gateway
        const routingKey = new RoutedQueue(GatewayExchangeRoutes.RECEIVE, clientId, "cache");
        const { queue } = await channel.assertQueue(routingKey.queue, { durable: false });

        await channel.prefetch(1);
        await channel.bindQueue(queue, "kanao-gateway", routingKey.key);
        await channel.consume(queue, message => {
            if (message) {
                channel.ack(message);

                // This will emit the dispatch event on the cache service
                this.emit("dispatch", JSON.parse(message.content.toString()));
            }
        });

        this.logger.info(`Successfully bind queue ${queue} to exchange kanao-gateway with routing key ${routingKey.key}`);
    }

    public async setupRpc(channel: Channel): Promise<void> {
        // Used for Counts RPC
        const rpc = new RoutedQueue(`${GatewayExchangeRoutes.REQUEST}.counts`, clientId, "cache-rpc");
        await channel.assertQueue(rpc.queue, { durable: false });
        await channel.bindQueue(rpc.queue, RabbitMQ.GATEWAY_EXCHANGE, rpc.key);

        await channel.consume(rpc.queue, async message => {
            if (message) {
                const content = JSON.parse(message.content.toString()) as { replyTo: string; };
                const guilds = await this.drizzle.select({ count: count(schema.guilds.id) }).from(schema.guilds).execute()
                    .then(rows => rows[0].count);
                const users = await this.drizzle.select({ count: count(schema.users.id) }).from(schema.users).execute()
                    .then(rows => rows[0].count);
                const channels = await this.drizzle.select({ count: count(schema.channels.id) }).from(schema.channels).execute()
                    .then(rows => rows[0].count);

                channel.ack(message);
                await this.cacheQueue.sendToQueue(content.replyTo, Buffer.from(
                    JSON.stringify({ route: rpc.key, clientId, guilds, users, channels })
                ), { correlationId: message.properties.correlationId as string });
            }
        });
    }
}

declare module "@sapphire/pieces" {
    interface Container {
        client: KanaoCache;
    }
}
