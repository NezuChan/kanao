import { pgTable, integer, text, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    discriminator: text("discriminator"),
    globalName: text("global_name"),
    avatar: text("avatar"),
    bot: boolean("bot"),
    flags: integer("flags"),
    premiumType: integer("premium_type"),
    publicFlags: integer("public_flags"),
    avatarDecoration: text("avatar_decoration"),
    locale: text("locale"),
    accentColor: integer("accent_color"),
    banner: text("banner"),
    mfaEnabled: boolean("mfa_enabled")
});
