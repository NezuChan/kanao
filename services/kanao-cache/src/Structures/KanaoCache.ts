import EventEmitter from "node:events";
import { RabbitMQ } from "@nezuchan/constants";
import * as schema from "@nezuchan/kanao-schema";
import { createAmqpChannel } from "@nezuchan/utilities";
import { StoreRegistry, container } from "@sapphire/pieces";
import type { Channel } from "amqplib";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { ListenerStore } from "../Stores/ListenerStore.js";
import { createLogger } from "../Utilities/Logger.js";
import { clientId, storeLogs, lokiHost, databaseUrl, amqp, databaseConnectionLimit } from "../config.js";

export class KanaoCache extends EventEmitter {
    public amqp = createAmqpChannel(amqp, {
        setup: async (channel: Channel) => this.setupAmqp(channel)
    });

    public logger = createLogger("kanao-cache", clientId, storeLogs, lokiHost);
    public pgClient = new pg.Pool({ connectionString: databaseUrl, max: databaseConnectionLimit });

    public drizzle = drizzle(this.pgClient, { schema });

    public stores = new StoreRegistry();

    public guildsCreateThrottle = 0;

    public async connect(): Promise<void> {
        container.client = this;
        await this.pgClient.connect();
        this.pgClient.on("error", e => this.logger.error(e, "Postgres emitted error"));

        this.stores.register(new ListenerStore());

        await this.stores.load();
    }

    public async setupAmqp(channel: Channel): Promise<void> {
        // await channel.prefetch(1);
        await channel.assertExchange(RabbitMQ.GATEWAY_QUEUE_SEND, "direct", { durable: true });
        await channel.assertExchange("nezu-gateway.cache", "direct", { durable: true });
        const { queue } = await channel.assertQueue("kanao-cache.receive", { durable: true });
        await channel.bindQueue(queue, "nezu-gateway.cache", clientId);

        this.logger.info("Successfully bind to cache queue!");

        await channel.consume(queue, message => {
            console.log(JSON.parse(message!.content.toString()));
            if (message && message.properties.replyTo === clientId) {
                channel.ack(message);
                this.emit("dispatch", JSON.parse(message.content.toString()));
            }
        });
    }
}

declare module "@sapphire/pieces" {
    interface Container {
        client: KanaoCache;
    }
}
