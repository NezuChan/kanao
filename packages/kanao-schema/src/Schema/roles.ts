import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
    id: text("id").primaryKey(),
    name: text("name"),
    color: integer("color"),
    hoist: boolean("hoist"),
    position: integer("position"),
    permissions: text("permissions"),
    guildId: text("guild_id")
});

export const memberRoles = pgTable("member_roles", {
    memberId: text("member_id").notNull(),
    roleId: text("role_id").notNull(),
    guildId: text("guild_id").notNull()
});

