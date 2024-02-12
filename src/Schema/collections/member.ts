import { relations } from "drizzle-orm";
import { pgTable, integer, text, boolean } from "drizzle-orm/pg-core";
import { memberRoles } from "./roles.js";
import { users } from "./user.js";

export const members = pgTable("members", {
    id: text("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    nick: text("nick"),
    avatar: text("avatar"),
    flags: integer("flags"),
    joinedAt: text("joined_at"),
    premiumSince: text("premium_since"),
    deaf: boolean("deaf"),
    mute: boolean("mute"),
    pending: boolean("pending"),
    permissions: integer("permissions"),
    communicationDisabledUntil: text("communication_disabled_until")
});

export const membersRelations = relations(members, ({ many }) => ({
    roles: many(memberRoles)
}));
