import { pgTable, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { voiceStates } from "./voice.js";

export const channels = pgTable("channels", {
    id: text("id").primaryKey()
});

export const guildsChannels = pgTable("guild_channels", {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
});

export const guildChannelsRelations = relations(guildsChannels, ({ many }) => ({
    states: many(voiceStates)
}));
