import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

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
    flags: integer("flags"),

    guildId: text("guild_id")
});

export const channelsOverwrite = pgTable("channels_overwrite", {
    userOrRole: text("user_or_role"),
    channelId: text("channel_id"),

    type: integer("type"),
    allow: text("allow"),
    deny: text("deny")
});
