import { relations } from "drizzle-orm";
import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";
import { attachment } from "./attachment.js";
import { channels } from "./channel.js";
import { embed } from "./embed.js";
import { reaction } from "./reaction.js";
import { roles } from "./roles.js";
import { users } from "./user.js";

export const messages = pgTable("messages", {
    id: text("id").primaryKey(),
    channelId: text("channel_id"),
    authorId: text("author_id"),
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

export const messageRelations = relations(messages, ({ one, many }) => ({
    channel: one(channels, {
        fields: [messages.channelId],
        references: [channels.id]
    }),
    author: one(users, {
        fields: [messages.authorId],
        references: [users.id]
    }),
    mentions: many(users),
    mentionRoles: many(roles),
    mentionChannels: many(channels),
    attachments: many(attachment),
    embeds: many(embed),
    reactions: many(reaction)
}));
