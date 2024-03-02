import { pgTable, integer, text, boolean, primaryKey } from "drizzle-orm/pg-core";

export const members = pgTable("members", {
    id: text("id"),
    guildId: text("guild_id"),

    nick: text("nick"),
    avatar: text("avatar"),
    flags: integer("flags"),
    joinedAt: text("joined_at"),
    premiumSince: text("premium_since"),
    deaf: boolean("deaf"),
    mute: boolean("mute"),
    pending: boolean("pending"),
    communicationDisabledUntil: text("communication_disabled_until")
}, table => ({
    pkWithCustomName: primaryKey({ name: "members_id_guild_id", columns: [table.id, table.guildId] })
}));
