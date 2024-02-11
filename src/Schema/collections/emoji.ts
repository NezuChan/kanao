import { relations } from "drizzle-orm";
import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { roles } from "./roles.js";
import { users } from "./user.js";

export const emojis = pgTable("emojis", {
    id: text("id").primaryKey(),
    name: text("name"),
    userId: text("user_id"),
    requireColons: boolean("require_colons"),
    managed: boolean("managed"),
    animated: boolean("animated"),
    available: boolean("available")
});

export const emojisRelations = relations(emojis, ({ many, one }) => ({
    roles: many(roles),
    user: one(users, {
        fields: [emojis.userId],
        references: [users.id]
    })
}));
