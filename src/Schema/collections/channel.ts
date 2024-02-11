import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { guilds } from "./guild.js";
import { voiceStates } from "./voice.js";

export const channelsOverwrite = pgTable("channels_overwrite", {
    id: text("id").primaryKey(),
    type: integer("type"),
    allow: text("allow"),
    deny: text("deny")
});

export const channels = pgTable("channels", {
    id: text("id").primaryKey(),
    type: integer("type"),
    position: integer("position"),
    name: text("name"),
    topic: text("topic"),
    nsfw: boolean("nsfw"),
    lastMessageId: text("last_message_id"),
    bitrate: integer("bitrate"),
    userLimit: integer("user_limit"),
    rateLimitPerUser: integer("rate_limit_per_user"),
    icon: text("icon"),
    ownerId: text("owner_id"),
    parentId: text("parent_id"),
    lastPinTimestamp: text("last_pin_timestamp"),
    rtcRegion: text("rtc_region"),
    videoQualityMode: integer("video_quality_mode"),
    messageCount: integer("message_count"),
    defaultAutoArchiveDuration: integer("default_auto_archive_duration"),
    permissions: text("permissions"),
    flags: integer("flags")
});

export const channelsOverwriteRelation = relations(channelsOverwrite, ({ one }) => ({
    channel: one(channels, {
        fields: [channelsOverwrite.id],
        references: [channels.id]
    })
}));

export const channelsRelation = relations(channels, ({ one, many }) => ({
    guild: one(guilds, {
        fields: [channels.id],
        references: [guilds.id]
    }),
    permission_overwrites: many(channelsOverwrite)
}));

export const guildsChannels = pgTable("guild_channels", {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
});

export const guildChannelsRelations = relations(guildsChannels, ({ many }) => ({
    states: many(voiceStates)
}));
