import { integer, text, pgTable } from "drizzle-orm/pg-core";

export const status = pgTable("status", {
    shardId: integer("shard_id").primaryKey(),
    latency: integer("latency"),
    lastAck: text("last_ack"),
    status: integer("status")
});
