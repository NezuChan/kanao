import { pgTable, text, boolean, primaryKey, index } from "drizzle-orm/pg-core";

export const voiceStates = pgTable("voice_states", {
    guildId: text("guild_id").notNull(),
    memberId: text("member_id").notNull(),

    channelId: text("channel_id").notNull(),
    sessionId: text("session_id"),

    deaf: boolean("deaf"),
    mute: boolean("mute"),
    selfDeaf: boolean("self_deaf"),
    selfMute: boolean("self_mute"),
    selfStream: boolean("self_stream"),
    selfVideo: boolean("self_video"),
    suppress: boolean("suppress"),
    requestToSpeakTimestamp: text("request_to_speak_timestamp")
}, table => ({
    // Member only have one voice state per guild, which only one channel
    primaryKey: primaryKey({ columns: [table.guildId, table.memberId] }),
    channelIdIdx: index("voice_states_channelId_idx").on(table.channelId),
    sessionIdIdx: index("voice_states_sessionId_idx").on(table.sessionId)
}));
