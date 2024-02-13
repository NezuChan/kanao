import { APIGuild, GatewayGuildCreateDispatchData, GuildDefaultMessageNotifications, GuildExplicitContentFilter, GuildFeature, GuildMFALevel, GuildPremiumTier } from "discord-api-types/v10";
import { Base } from "./Base.js";
import { BaseImageURLOptions } from "@discordjs/rest";
import { DiscordSnowflake } from "@sapphire/snowflake";

export class Guild extends Base<APIGuild | GatewayGuildCreateDispatchData> {
    public get name(): string {
        return this.data.name;
    }

    public get description(): string | null {
        return this.data.description;
    }

    public get available(): boolean {
        return Boolean("unavailable" in this.data ? this.data.unavailable : false);
    }

    public get discoverySplash(): string | null {
        return this.data.discovery_splash ?? null;
    }

    public get memberCount(): number {
        return "member_count" in this.data ? this.data.member_count : 0;
    }

    public get large(): boolean {
        return Boolean("large" in this.data ? this.data.large : false);
    }

    public get premiumProgressBarEnabled(): boolean {
        return Boolean(this.data.premium_progress_bar_enabled);
    }

    public get applicationId(): string | null {
        return this.data.application_id;
    }

    public get afkTimeout(): APIGuild["afk_timeout"] {
        return this.data.afk_timeout;
    }

    public get afkChannelId(): string | null {
        return this.data.afk_channel_id;
    }

    public get systemChannelId(): string | null {
        return this.data.system_channel_id;
    }

    public get premiumTier(): GuildPremiumTier {
        return this.data.premium_tier;
    }

    public get premiumSubscriptionCount(): number | undefined {
        return this.data.premium_subscription_count;
    }

    public get widgetEnabled(): boolean {
        return Boolean(this.data.widget_enabled);
    }

    public get widgetChannelId(): string | null | undefined {
        return this.data.widget_channel_id;
    }

    public get explicitContentFilter(): GuildExplicitContentFilter {
        return this.data.explicit_content_filter;
    }

    public get mfaLevel(): GuildMFALevel {
        return this.data.mfa_level;
    }

    public get createdTimestamp(): number {
        return Number(DiscordSnowflake.deconstruct(this.id).timestamp);
    }

    public get createdAt(): Date {
        return new Date(this.createdTimestamp);
    }

    public get joinedTimestamp(): number {
        return "joined_at" in this.data ? Date.parse(this.data.joined_at) : 0;
    }

    public get defaultMessageNotifications(): GuildDefaultMessageNotifications {
        return this.data.default_message_notifications;
    }

    public get maximumMembers(): number | undefined {
        return this.data.max_members;
    }

    public get maximumPresences(): number | null | undefined {
        return this.data.max_presences;
    }

    public get maxVideoChannelUsers(): number | undefined {
        return this.data.max_video_channel_users;
    }

    public get approximateMemberCount(): number | undefined {
        return this.data.approximate_member_count;
    }

    public get rulesChannelId(): string | null {
        return this.data.rules_channel_id;
    }

    public get publicUpdatesChannelId(): string | null {
        return this.data.public_updates_channel_id;
    }

    public get ownerId(): string | null {
        return this.data.owner_id;
    }

    public get joinedAt(): Date {
        return new Date(this.joinedTimestamp);
    }

    public get features(): APIGuild["features"] {
        return this.data.features;
    }

    public get icon(): string | null {
        return this.data.icon;
    }

    public get banner(): string | null {
        return this.data.banner;
    }

    public bannerURL(options?: BaseImageURLOptions): string | null {
        return this.banner && this.client.rest.cdn.banner(this.id, this.banner, options);
    }

    public iconURL(options?: BaseImageURLOptions): string | null {
        return this.icon && this.client.rest.cdn.icon(this.id, this.icon, options);
    }

    public discoverySplashURL(options?: BaseImageURLOptions): string | null {
        return this.discoverySplash && this.client.rest.cdn.discoverySplash(this.id, this.discoverySplash, options);
    }

    public get maximumBitrate(): 96_000 | 128_000 | 256_000 | 384_000 {
        if (this.features.includes(GuildFeature.VIPRegions)) {
            return 384_000;
        }

        switch (this.premiumTier) {
            case GuildPremiumTier.Tier1:
                return 128_000;
            case GuildPremiumTier.Tier2:
                return 256_000;
            case GuildPremiumTier.Tier3:
                return 384_000;
            default:
                return 96_000;
        }
    }
}
