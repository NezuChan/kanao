import { Collection } from "@discordjs/collection";
import { BootstrapOptions, WebSocketShard, WebSocketShardEvents, WorkerReceivePayload, WorkerReceivePayloadOp, WorkerSendPayload, WorkerSendPayloadOp, WorkerData, WebSocketShardDestroyOptions } from "@discordjs/ws";
import { ProcessContextFetchingStrategy } from "./ProcessContextFetchingStrategy.js";
import { StoreRegistry } from "@sapphire/pieces";
import { ListenerStore } from "../../Stores/ListenerStore.js";
import { discordToken, storeLogs, lokiHost } from "../../config.js";
import { createLogger } from "../Logger.js";
import EventEmitter from "events";
import { createRedis } from "../CreateRedis.js";
import { createAmqpChannel } from "../CreateAmqpChannel.js";
import { RabbitMQ } from "@nezuchan/constants";
import { Result } from "@sapphire/result";
import { GatewaySendPayload } from "discord-api-types/v10";
import { ShardOp } from "../ShardOp.js";
import { RoutingKey, RoutingKeyToId } from "../RoutingKey.js";

export class ProcessBootstrapper {
    public redis = createRedis();

    /**
	 * The data passed to the worker thread
	 */
    protected readonly data = JSON.parse(process.env.WORKER_DATA!) as WorkerData;

    /**
	 * The shards that are managed by this worker
	 */
    protected readonly shards = new Collection<number, WebSocketShard>();

    public constructor(
        public logger = createLogger("nezu-gateway", Buffer.from(discordToken.split(".")[0], "base64").toString(), storeLogs, lokiHost),
        public stores = new StoreRegistry()
    ) { }

    /**
     * Bootstraps the child process with the provided options
     */
    public async bootstrap(options: Readonly<BootstrapOptions> = {}): Promise<void> {
        await this.setupAmqp();
        await this.stores.load();
        // Start by initializing the shards
        for (const shardId of this.data.shardIds) {
            const shard = new WebSocketShard(new ProcessContextFetchingStrategy(this.data), shardId);
            for (const event of options.forwardEvents ?? Object.values(WebSocketShardEvents)) {
                // @ts-expect-error: Event types incompatible
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                shard.on(event, data => {
                    const payload = {
                        op: WorkerReceivePayloadOp.Event,
                        event,
                        data,
                        shardId
                    } satisfies WorkerReceivePayload;
                    process.send!(payload);
                    this.stores.get("listeners")
                        .emitter.emit(event, { shard, data, shardId });
                });
            }

            // Any additional setup the user might want to do
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

    public async setupAmqp() {
        const amqp = await createAmqpChannel();

        this.stores.register(
            new ListenerStore({
                logger: this.logger,
                emitter: new EventEmitter(),
                redis: this.redis,
                amqp
            })
        );

        await amqp.assertExchange(RabbitMQ.GATEWAY_EXCHANGE, "direct", { durable: false });
        await amqp.assertExchange(RabbitMQ.GATEWAY_QUEUE_SEND, "direct", { durable: false });
        const { queue } = await amqp.assertQueue("", { exclusive: true });

        await Promise.all(
            this.data.shardIds.map(async shardId => {
                await amqp.bindQueue(queue, RabbitMQ.GATEWAY_EXCHANGE, RoutingKey(shardId));
            })
        );

        await Result.fromAsync(() => amqp.consume(queue, async message => {
            if (message) {
                const content = JSON.parse(message.content.toString()) as { op: number; data: unknown };
                const shardId = RoutingKeyToId(message.fields.routingKey);
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
                }
            }
        }));
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
            await new Promise(r => setTimeout(r, Math.min(++retries * 1000, 10000)));
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

                case WorkerSendPayloadOp.SessionInfoResponse: case WorkerSendPayloadOp.ShardCanIdentify: {
                    // eslint-disable-next-line @typescript-eslint/dot-notation
                    this.shards.forEach(shard => (shard["strategy"] as ProcessContextFetchingStrategy).messageCallback(payload));
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
                    } satisfies WorkerReceivePayload;

                    process.send!(response);
                    break;
                }
            }
        });
    }
}

declare module "@sapphire/pieces" {
    interface StoreRegistryEntries {
        listeners: ListenerStore;
    }
}
