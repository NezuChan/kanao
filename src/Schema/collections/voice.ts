import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { guildsChannels } from "./channel.js";
import { guilds } from "./guild.js";
import { members } from "./member.js";

export const voiceStates = pgTable("voice_states", {
    channelId: text("channel_id").references(() => guildsChannels.id, { onDelete: "cascade" }),
    guildId: text("guild_id").references(() => guilds.id, { onDelete: "cascade" }),
    memberId: text("member_id").primaryKey().references(() => members.id, { onDelete: "cascade" }),
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
