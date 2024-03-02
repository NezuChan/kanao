import { pgTable, integer, text, boolean } from "drizzle-orm/pg-core";

export const members = pgTable("members", {
    id: text("id").primaryKey(),
    guildId: text("guild_id").notNull(),

    nick: text("nick"),
    avatar: text("avatar"),
    flags: integer("flags"),
    joinedAt: text("joined_at"),
    premiumSince: text("premium_since"),
    deaf: boolean("deaf"),
    mute: boolean("mute"),
    pending: boolean("pending"),
    communicationDisabledUntil: text("communication_disabled_until")
});
