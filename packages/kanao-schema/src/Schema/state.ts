import { pgTable, text, boolean, primaryKey } from "drizzle-orm/pg-core";
import { channels } from "./channel.js";
import { guilds } from "./guild.js";
import { members } from "./member.js";

export const voiceStates = pgTable("voice_states", {
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    guildId: text("guild_id").references(() => guilds.id, { onDelete: "cascade" }),
    channelId: text("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
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
    pk: primaryKey({ columns: [table.memberId, table.channelId] })
}));
