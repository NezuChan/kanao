import { relations } from "drizzle-orm";
import { pgTable, integer, text } from "drizzle-orm/pg-core";
import { memberRoles } from "./roles.js";
import { users } from "./user.js";

export const members = pgTable("members", {
    id: text("id").primaryKey(),

    avatar: text("avatar"),
    flags: integer("flags")
});

export const membersRelations = relations(members, ({ many, one }) => ({
    roles: many(memberRoles),
    user: one(users, {
        fields: [members.id],
        references: [users.id]
    })
}));
