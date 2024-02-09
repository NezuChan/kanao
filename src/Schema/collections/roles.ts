import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { guilds } from "./guild.ts";
import { members } from "./member.ts";

export const roles = pgTable("roles", {
    id: text("id").primaryKey(),
    name: text("name"),
    color: integer("color"),
    hoist: boolean("hoist"),
    position: integer("position"),
    permissions: text("permissions")
});

export const memberRoles = pgTable("member_roles", {
    id: text("id").primaryKey(),

    roleId: text("role_id")
});

export const memberRolesRelations = relations(memberRoles, ({ one }) => ({
    role: one(roles, {
        fields: [memberRoles.roleId],
        references: [roles.id]
    }),
    member: one(members, {
        fields: [memberRoles.id],
        references: [members.id]
    })
}));

export const guildsRoles = pgTable("guild_roles", {
    id: text("id").primaryKey(),
    roleId: text("role_id").primaryKey()
});

export const guildsRolesRelations = relations(guildsRoles, ({ one }) => ({
    role: one(roles, {
        fields: [guildsRoles.roleId],
        references: [roles.id]
    }),
    guild: one(guilds, {
        fields: [guildsRoles.id],
        references: [guilds.id]
    })
}));
