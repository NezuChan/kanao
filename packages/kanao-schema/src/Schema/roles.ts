import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
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
    id: text("id").primaryKey().references(() => members.id, { onDelete: "cascade" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "cascade" })
});

export const guildsRoles = pgTable("guild_roles", {
    id: text("id").primaryKey().references(() => guilds.id, { onDelete: "cascade" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "cascade" })
});
