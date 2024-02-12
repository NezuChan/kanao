import { relations } from "drizzle-orm";
import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { guildsChannels } from "./channel.js";
import { guilds } from "./guild.js";
import { members } from "./member.js";

export const voiceStates = pgTable("voice_states", {
    channelId: text("channel_id"),
    guildId: text("guild_id"),
    memberId: text("member_id").primaryKey(),
    sessionId: text("session_id"),
    deaf: boolean("deaf"),
    mute: boolean("mute"),
    selfDeaf: boolean("self_deaf"),
    selfMute: boolean("self_mute"),
    selfStream: boolean("self_stream"),
    selfVideo: boolean("self_video"),
    suppress: boolean("suppress"),
    requestToSpeakTimestamp: text("request_to_speak_timestamp")
});

export const voiceStatesRelations = relations(voiceStates, ({ one }) => ({
    channel: one(guildsChannels, {
        fields: [voiceStates.channelId],
        references: [guildsChannels.id]
    }),
    guild: one(guilds, {
        fields: [voiceStates.guildId],
        references: [guilds.id]
    }),
    member: one(members, {
        fields: [voiceStates.memberId],
        references: [members.id]
    })
}));
