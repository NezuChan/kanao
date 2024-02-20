/* eslint-disable unicorn/no-array-for-each */
/* eslint-disable promise/param-names */
/* eslint-disable no-param-reassign */
/* eslint-disable no-promise-executor-return */
/* eslint-disable consistent-return */

import { Buffer } from "node:buffer";
import EventEmitter from "node:events";
import process from "node:process";
import { setTimeout } from "node:timers";
import { Collection } from "@discordjs/collection";
import type { BootstrapOptions, WorkerReceivePayload, WorkerSendPayload, WorkerData, WebSocketShardDestroyOptions } from "@discordjs/ws";
import { WebSocketShardEvents, WebSocketShard, WorkerReceivePayloadOp, WorkerSendPayloadOp } from "@discordjs/ws";
import { RabbitMQ, ShardOp } from "@nezuchan/constants";
import * as schema from "@nezuchan/kanao-schema";
import { RoutingKey, RoutingKeyToId, createAmqpChannel } from "@nezuchan/utilities";
import { StoreRegistry } from "@sapphire/pieces";
import type { Channel, ConsumeMessage } from "amqplib";
import type { GatewaySendPayload } from "discord-api-types/v10";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { Listener } from "../../Stores/Listener.js";
import { ListenerStore } from "../../Stores/ListenerStore.js";
import { discordToken, storeLogs, lokiHost, amqp, databaseUrl, clientId } from "../../config.js";
import { createLogger } from "../Logger.js";
import { ProcessContextFetchingStrategy } from "./ProcessContextFetchingStrategy.js";

export class ProcessBootstrapper {
    public pgClient = new pg.Client({ connectionString: databaseUrl });

    public drizzle = drizzle(this.pgClient, { schema });

    /**
     * The data passed to the child process
     */
    protected readonly data = JSON.parse(process.env.WORKER_DATA!) as WorkerData & { processId: number; };

    /**
     * The shards that are managed by this process
     */
    protected readonly shards = new Collection<number, WebSocketShard>();

    public constructor(
        public logger = createLogger("kanao-gateway", Buffer.from(discordToken.split(".")[0], "base64").toString(), storeLogs, lokiHost),
        public stores = new StoreRegistry()
    ) {}

    /**
     * Bootstraps the child process with the provided options
     */
    public async bootstrap(options: Readonly<BootstrapOptions> = {}): Promise<void> {
        await this.pgClient.connect();
        this.setupAmqp(); await this.stores.load();

        // Start by initializing the shards
        for (const shardId of this.data.shardIds) {
            const shard = new WebSocketShard(new ProcessContextFetchingStrategy(this.data), shardId);
            for (const event of options.forwardEvents ?? Object.values(WebSocketShardEvents)) {
                // @ts-expect-error: Event types incompatible

                shard.on(event, data => {
                    const payload = {
                        op: WorkerReceivePayloadOp.Event,
                        event,
                        data,
                        shardId
                    } satisfies WorkerReceivePayload;
                    process.send!(payload);
                    (this.stores.get("listeners") as unknown as Listener).emitter!.emit(event, { shard, data, shardId });
                });
            }

            await options.shardCallback?.(shard);
            this.shards.set(shardId, shard);
        }

        // Lastly, start listening to messages from the parent thread
        this.setupThreadEvents();

        const message = {
            op: WorkerReceivePayloadOp.WorkerReady
        } satisfies WorkerReceivePayload;
        process.send!(message);
    }

    public setupAmqp(): void {
        const amqpChannel = createAmqpChannel(amqp, {
            setup: async (channel: Channel) => {
                await channel.assertExchange(RabbitMQ.GATEWAY_EXCHANGE, "direct", { durable: false });
                await channel.assertExchange(RabbitMQ.GATEWAY_QUEUE_SEND, "direct", { durable: false });
                const { queue } = await channel.assertQueue("", { exclusive: true });

                for (const shard of this.data.shardIds) {
                    await channel.bindQueue(queue, RabbitMQ.GATEWAY_EXCHANGE, RoutingKey(clientId, shard));
                }

                await channel.consume(queue, async m => this.onConsumeMessage(channel, m));
            }
        });

        amqpChannel.on("error", err => this.logger.error(err, `AMQP Channel on process ${this.data.processId} Error`));
        amqpChannel.on("close", () => this.logger.warn(`AMQP Channel on process ${this.data.processId} Closed`));
        amqpChannel.on("connect", () => this.logger.info(`AMQP Channel handler on process ${this.data.processId} connected`));

        this.stores.register(
            new ListenerStore({
                logger: this.logger,
                emitter: new EventEmitter(),
                drizzle: this.drizzle,
                amqp: amqpChannel
            })
        );
    }

    public async onConsumeMessage(channel: Channel, message: ConsumeMessage | null): Promise<void> {
        if (!message) return;
        channel.ack(message);
        const content = JSON.parse(message.content.toString()) as { op: ShardOp; data: unknown; };
        const shardId = RoutingKeyToId(clientId, message.fields.routingKey);
        switch (content.op) {
            case ShardOp.SEND: {
                const shard = this.shards.get(shardId);
                this.logger.debug(content, `Received message from AMQP to send to shard ${shardId}`);
                if (shard) {
                    await shard.send(content.data as GatewaySendPayload);
                }
                break;
            }
            case ShardOp.CONNECT: {
                this.logger.debug(content, `Received message from AMQP to connect shard ${shardId}`);
                await this.connect(shardId);
                break;
            }
            case ShardOp.RESTART: {
                const shard = this.shards.get(shardId);
                this.logger.debug(content, `Received message from AMQP to restart shard ${shardId}`);
                if (shard) {
                    await this.destroy(shardId, content.data as WebSocketShardDestroyOptions);
                    await this.connect(shardId);
                }
                break;
            }

            default:
                break;
        }
    }

    /**
     * Helper method to initiate a shard's connection process
     */
    protected async connect(shardId: number, retries = 0): Promise<void> {
        const shard = this.shards.get(shardId);
        if (!shard) {
            throw new RangeError(`Shard ${shardId} does not exist`);
        }

        try {
            await shard.connect();
        } catch {
            await new Promise(r => setTimeout(r, Math.min(++retries * 1_000, 10_000)));
            return this.connect(shardId, retries);
        }
    }

    /**
     * Helper method to destroy a shard
     */
    protected async destroy(shardId: number, options?: WebSocketShardDestroyOptions): Promise<void> {
        const shard = this.shards.get(shardId);
        if (!shard) {
            throw new RangeError(`Shard ${shardId} does not exist`);
        }

        await shard.destroy(options);
    }

    /**
     * Helper method to attach event listeners to the parentPort
     */
    protected setupThreadEvents(): void {
        process.on("message", async (payload: WorkerSendPayload) => {
            switch (payload.op) {
                case WorkerSendPayloadOp.Connect: {
                    await this.connect(payload.shardId);
                    const response: WorkerReceivePayload = {
                        op: WorkerReceivePayloadOp.Connected,
                        shardId: payload.shardId
                    };
                    process.send!(response);
                    break;
                }

                case WorkerSendPayloadOp.Destroy: {
                    await this.destroy(payload.shardId, payload.options);
                    const response: WorkerReceivePayload = {
                        op: WorkerReceivePayloadOp.Destroyed,
                        shardId: payload.shardId
                    };

                    process.send!(response);
                    break;
                }

                case WorkerSendPayloadOp.Send: {
                    const shard = this.shards.get(payload.shardId);
                    if (!shard) {
                        throw new RangeError(`Shard ${payload.shardId} does not exist`);
                    }

                    await shard.send(payload.payload);
                    break;
                }

                case WorkerSendPayloadOp.SessionInfoResponse: case WorkerSendPayloadOp.ShardIdentifyResponse: {
                    // @ts-expect-error Shard#strategy is private.
                    this.shards.forEach(shard => (shard.strategy as ProcessContextFetchingStrategy).messageCallback(payload));
                    break;
                }

                case WorkerSendPayloadOp.FetchStatus: {
                    const shard = this.shards.get(payload.shardId);
                    if (!shard) {
                        throw new Error(`Shard ${payload.shardId} does not exist`);
                    }

                    const response = {
                        op: WorkerReceivePayloadOp.FetchStatusResponse,
                        status: shard.status,
                        nonce: payload.nonce
                    };

                    process.send!(response);
                    break;
                }

                default:
                    break;
            }
        });
    }
}

declare module "@sapphire/pieces" {
    type StoreRegistryEntries = {
        listeners: ListenerStore;
    };
}
