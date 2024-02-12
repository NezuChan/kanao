import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";
import { channels } from "./channel.js";
import { users } from "./user.js";

export const messages = pgTable("messages", {
    id: text("id").primaryKey(),

    channelId: text("channel_id").references(() => channels.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),

    content: text("content"),
    timestamp: text("timestamp"),
    editedTimestamp: text("edited_timestamp"),
    tts: boolean("tts"),
    mentionEveryone: boolean("mention_everyone"),
    nonce: text("nonce"),
    pinned: boolean("pinned"),
    webhookId: text("webhook_id"),
    type: integer("type"),
    applicationId: text("application_id"),
    flags: integer("flags"),
    position: integer("position")
});
