import { pgTable, text } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
});
