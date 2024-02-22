import { sqliteTable, text, int } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
    id: int("id").primaryKey(),
    resumeURL: text("resume_url").notNull(),
    sequence: int("sequence").notNull(),
    sessionId: text("session_id").notNull(),
    shardCount: int("shardCount").notNull()
});

export const status = sqliteTable("status", {
    shardId: int("shard_id").primaryKey(),
    latency: int("latency"),
    lastAck: text("last_ack"),
    status: int("status")
});

