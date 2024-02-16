import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { guilds } from "./guild.js";
import { members } from "./member.js";

export const roles = pgTable("roles", {
    id: text("id").primaryKey(),
    name: text("name"),
    color: integer("color"),
    hoist: boolean("hoist"),
    position: integer("position"),
    permissions: text("permissions")
});

export const memberRoles = pgTable("member_roles", {
    id: serial("id").primaryKey(),
    memberId: text("member_id").references(() => members.id, { onDelete: "cascade" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "cascade" }),
    guildId: text("guild_id").references(() => guilds.id, { onDelete: "cascade" })
});

export const guildsRoles = pgTable("guild_roles", {
    id: serial("id").primaryKey(),

    guildId: text("guild_id").references(() => guilds.id, { onDelete: "cascade" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "cascade" })
});

export const memberRolesRelations = relations(memberRoles, ({ one }) => ({
    role: one(roles, {
        fields: [memberRoles.roleId],
        references: [roles.id]
    })
}));
