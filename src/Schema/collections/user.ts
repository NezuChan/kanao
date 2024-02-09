import { pgTable, integer, text, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    discriminator: text("discriminator"),
    globalName: text("global_name"),
    avatar: text("avatar"),
    bot: boolean("bot"),
    flags: integer("flags")
});
