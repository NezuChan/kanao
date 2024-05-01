import { boolean, index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
    id: text("id").primaryKey(),
    name: text("name"),
    color: integer("color"),
    hoist: boolean("hoist"),
    position: integer("position"),
    permissions: text("permissions"),

    guildId: text("guild_id")
}, table => ({ guildIdIdx: index("roles_guildId_idx").on(table.guildId) }));

export const memberRoles = pgTable("member_roles", {
    memberId: text("member_id").notNull(),
    roleId: text("role_id").notNull(),
    guildId: text("guild_id").notNull()
}, table => ({
    primaryKey: primaryKey({ columns: [table.memberId, table.roleId] }),
    guildIdIdx: index("member_roles_guildId_idx").on(table.guildId)
}));

