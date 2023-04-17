import { Collection } from "@discordjs/collection";
import { BootstrapOptions, WebSocketShard, WebSocketShardEvents, WorkerReceivePayload, WorkerReceivePayloadOp, WorkerSendPayload, WorkerSendPayloadOp, WorkerData, WebSocketShardDestroyOptions } from "@discordjs/ws";
import { ProcessContextFetchingStrategy } from "./ProcessContextFetchingStrategy.js";
import { StoreRegistry } from "@sapphire/pieces";
import { ListenerStore } from "../../Stores/ListenerStore.js";
import { discordToken, storeLogs, lokiHost, redisClusters, redisClusterScaleReads, redisDb, redisHost, redisNatMap, redisPassword, redisPort, redisUsername } from "../../config.js";
import { createLogger } from "../Logger.js";
import EventEmitter from "events";
import { default as IORedis } from "ioredis";

const { default: Redis, Cluster } = IORedis;

export class ProcessBootstrapper {
    public redis =
        redisClusters.length
            ? new Cluster(
                redisClusters,
                {
                    scaleReads: redisClusterScaleReads as IORedis.NodeRole,
                    redisOptions: {
                        password: redisPassword,
                        username: redisUsername,
                        db: redisDb
                    },
                    natMap: redisNatMap
                }
            )
            : new Redis({
                username: redisPassword,
                password: redisPassword,
                host: redisHost,
                port: redisPort,
                db: redisDb,
                natMap: redisNatMap
            });

    /**
	 * The data passed to the worker thread
	 */
    protected readonly data = JSON.parse(process.env.WORKER_DATA!) as WorkerData;

    /**
	 * The shards that are managed by this worker
	 */
    protected readonly shards = new Collection<number, WebSocketShard>();

    public constructor(
        public logger = createLogger("nezu-gateway", Buffer.from(discordToken.split(".")[0], "base64").toString(), storeLogs, lokiHost ? new URL(lokiHost) : undefined),
        public stores = new StoreRegistry()
    ) {
        this.stores.register(
            new ListenerStore({
                logger,
                emitter: new EventEmitter(),
                redis: this.redis
            })
        );
    }

    /**
     * Bootstraps the child process with the provided options
     */
    public async bootstrap(options: Readonly<BootstrapOptions> = {}): Promise<void> {
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

                case WorkerSendPayloadOp.SessionInfoResponse:
                case WorkerSendPayloadOp.ShardIdentifyResponse: {
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
