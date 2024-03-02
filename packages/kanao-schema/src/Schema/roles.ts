import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

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
}, table => ({
    pkWithCustomName: primaryKey({ name: "voice_states_member_id_role_id_guild_id", columns: [table.memberId, table.roleId] })
}));

export const memberRolesRelations = relations(memberRoles, ({ one }) => ({
    role: one(roles, {
        fields: [memberRoles.roleId],
        references: [roles.id]
    })
}));
