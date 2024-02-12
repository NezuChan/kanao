import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
    id: integer("id").primaryKey(),

    resumeURL: text("resume_url").notNull(),
    sequence: integer("sequence").notNull(),
    sessionId: text("session_id").notNull(),
    shardCount: integer("shardCount").notNull()
});
