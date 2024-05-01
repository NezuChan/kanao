import { pgTable, text, boolean, integer, index } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
    id: text("id").primaryKey(),

    channelId: text("channel_id").notNull(),
    authorId: text("author_id").notNull(),
    guildId: text("guild_id"),

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
}, table => ({
    guildIdIdx: index("messages_guildId_idx").on(table.guildId),
    channelIdIdx: index("messages_channelId_idx").on(table.channelId),
    authorIdIdx: index("messages_authorId_idx").on(table.authorId)
}));
