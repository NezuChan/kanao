import { pgTable, text, boolean, primaryKey } from "drizzle-orm/pg-core";

export const voiceStates = pgTable("voice_states", {
    memberId: text("member_id").notNull(),
    guildId: text("guild_id").notNull(),
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
    pkWithCustomName: primaryKey({ name: "voice_states_member_id_guild_id", columns: [table.memberId, table.guildId] })
}));
