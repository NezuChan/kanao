import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { channels } from "./channel.ts";
import { guilds } from "./guild.ts";

export const voiceStates = pgTable("voice_states", {
    id: text("id").primaryKey(),
    guildId: text("id").references(() => guilds.id)
});

export const voiceStatesRelations = relations(voiceStates, ({ one }) => ({
    channel: one(channels, {
        fields: [voiceStates.id],
        references: [channels.id]
    }),
    guild: one(guilds, {
        fields: [voiceStates.guildId],
        references: [guilds.id]
    })
}));
