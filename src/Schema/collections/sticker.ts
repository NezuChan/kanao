import { relations } from "drizzle-orm";
import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";
import { guilds } from "./guild.js";
import { users } from "./user.js";

export const stickers = pgTable("stickers", {
    id: text("id").primaryKey(),
    packId: text("pack_id"),
    name: text("name"),
    description: text("description"),
    tags: text("tags"),
    asset: text("asset"),
    type: integer("type"),
    userId: text("user_id"),
    formatType: integer("format_type"),
    available: boolean("available"),
    guildId: text("guild_id")
});

export const stickersRelation = relations(stickers, ({ one }) => ({
    user: one(users, {
        fields: [stickers.userId],
        references: [users.id]
    }),
    guild: one(guilds, {
        fields: [stickers.guildId],
        references: [guilds.id]
    })
}));
