import { redisClusterScaleReads, redisClusters, redisDb, redisHost, redisNatMap, redisPassword, redisPort, redisUsername } from "../config.js";
import { default as IORedis } from "ioredis";

const { default: Redis, Cluster } = IORedis;

export function createRedis() {
    return redisClusters.length
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
            username: redisUsername,
            password: redisPassword,
            host: redisHost,
            port: redisPort,
            db: redisDb,
            natMap: redisNatMap
        });
}
