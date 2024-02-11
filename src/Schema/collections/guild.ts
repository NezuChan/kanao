import { relations } from "drizzle-orm";
import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";
import { emojis } from "./emoji.js";
import { guildsRoles } from "./roles.js";
import { stickers } from "./sticker.js";
import { voiceStates } from "./voice.js";

export const guilds = pgTable("guilds", {
    id: text("id").primaryKey(),
    unavailable: boolean("unavailable"),
    name: text("name"),
    icon: text("icon"),
    iconHash: text("icon_hash"),
    splash: text("splash"),
    discoverySplash: text("discovery_splash"),
    owner: boolean("owner"),
    ownerId: text("owner_id"),
    permissions: text("permissions"),
    region: text("region"),
    afkChannelId: text("afk_channel_id"),
    afkTimeout: integer("afk_timeout"),
    widgetEnabled: boolean("widget_enabled"),
    widgetChannelId: text("widget_channel_id"),
    verificationLevel: integer("verification_level"),
    defaultMessageNotifications: integer("default_message_notifications"),
    explicitContentFilter: integer("explicit_content_filter"),
    mfaLevel: integer("mfa_level"),
    systemChannelId: text("system_channel_id"),
    systemChannelFlags: integer("system_channel_flags"),
    rulesChannelId: text("rules_channel_id"),
    maxPresences: integer("max_presences"),
    maxMembers: integer("max_members"),
    vanityUrlCode: text("vanity_url_code"),
    description: text("description"),
    banner: text("banner"),
    premiumTier: integer("premium_tier"),
    premiumSubscriptionCount: integer("premium_subscription_count"),
    preferredLocale: text("preferred_locale"),
    publicUpdatesChannelId: text("public_updates_channel_id"),
    maxVideoChannelUsers: integer("max_video_channel_users"),
    approximateMemberCount: integer("approximate_member_count"),
    approximatePresenceCount: integer("approximate_presence_count"),
    nsfwLevel: integer("nsfw_level"),
    premiumBoostingBarEnabled: boolean("premium_boosting_bar_enabled"),
    safetyAlertChannelId: text("safety_alert_channel_id")
});

export const guildsRelations = relations(guilds, ({ many }) => ({
    roles: many(guildsRoles),
    voiceStates: many(voiceStates),
    emojis: many(emojis),
    stickers: many(stickers)
}));
