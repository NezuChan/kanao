import { relations } from "drizzle-orm";
import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";
import { messages } from "./message.js";

export const reaction = pgTable("reaction", {
    messageId: text("message_id").primaryKey(),
    count: integer("count"),
    countDetails: text("count_details"),
    me: boolean("me"),
    meBurst: boolean("me_burst"),
    burstColor: text("burst_color").array()
});

export const reactionRelations = relations(reaction, ({ one }) => ({
    message: one(messages, {
        fields: [reaction.messageId],
        references: [messages.id]
    })
}));
