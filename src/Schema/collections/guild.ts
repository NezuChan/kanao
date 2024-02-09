import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { guildsRoles } from "./roles.ts";
import { voiceStates } from "./voice.ts";

export const guilds = pgTable("guilds", {
    id: text("id").primaryKey(),

    name: text("name")
});

export const guildsRelations = relations(guilds, ({ many }) => ({
    roles: many(guildsRoles),
    voiceStates: many(voiceStates)
}));