import { chunk, range } from "@sapphire/utilities";

const shards = range(0, 17, 1);
const chunks = chunk(shards, 6);
const parts = "/staging-gateway-3".split("-");
const replicaId = Number(parts[parts.length - 1]) - 1;
const shardIds = chunks[replicaId];

console.log(
    `Replica ${replicaId + 1} is responsible for shards ${shardIds.join(", ")}`
)