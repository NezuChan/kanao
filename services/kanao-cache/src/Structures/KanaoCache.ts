import EventEmitter from "node:events";
import * as schema from "@nezuchan/kanao-schema";
import { createAmqpChannel } from "@nezuchan/utilities";
import { StoreRegistry, container } from "@sapphire/pieces";
import type { ChannelWrapper } from "amqp-connection-manager";
import type { Channel } from "amqplib";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { ListenerStore } from "../Stores/ListenerStore.js";
import { createLogger } from "../Utilities/Logger.js";
import { clientId, storeLogs, lokiHost, databaseUrl, amqp } from "../config.js";

export class KanaoCache extends EventEmitter {
    public amqp!: ChannelWrapper;

    public logger = createLogger("kanao-cache", clientId, storeLogs, lokiHost);
    public pgClient = new pg.Client({ connectionString: databaseUrl });

    public drizzle = drizzle(this.pgClient, { schema });

    public stores = new StoreRegistry();

    public async connect(): Promise<void> {
        container.client = this;
        this.amqp = createAmqpChannel(amqp, {
            setup: async (channel: Channel) => this.setupAmqp(channel)
        });
        await this.pgClient.connect();
        this.pgClient.on("error", e => this.logger.error(e, "Postgres emitted error"));

        this.stores.register(new ListenerStore());

        await this.stores.load();
    }

    public async setupAmqp(channel: Channel): Promise<void> {
        await channel.prefetch(1);
        const { queue } = await channel.assertQueue("kanao-cache.receive", { durable: true });

        this.logger.info("Successfully bind to cache queue!");

        await channel.consume(queue, message => {
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
