import type { BaseImageURLOptions } from "@discordjs/rest";
import type { guilds } from "@nezuchan/kanao-schema";
import { DiscordSnowflake } from "@sapphire/snowflake";
import type { APIGuild, GuildDefaultMessageNotifications, GuildExplicitContentFilter, GuildMFALevel } from "discord-api-types/v10";
import { GuildPremiumTier } from "discord-api-types/v10";
import type { InferSelectModel } from "drizzle-orm";
import { Base } from "./Base.js";

export class Guild extends Base<Partial<InferSelectModel<typeof guilds>>> {
    public get name(): string {
        return this.data.name!;
    }

    public get description(): string | null {
        return this.data.description!;
    }

    public get available(): boolean {
        return Boolean("unavailable" in this.data ? this.data.unavailable : false);
    }

    public get discoverySplash(): string | null {
        return this.data.discoverySplash ?? null;
    }

    public get memberCount(): number {
        return this.memberCount;
    }

    public get premiumProgressBarEnabled(): boolean {
        return Boolean(this.data.premiumProgressBarEnabled);
    }

    public get afkTimeout(): APIGuild["afk_timeout"] {
        return this.data.afkTimeout as APIGuild["afk_timeout"];
    }

    public get afkChannelId(): string | null | undefined {
        return this.data.afkChannelId;
    }

    public get systemChannelId(): string | null | undefined {
        return this.data.systemChannelId;
    }

    public get premiumTier(): GuildPremiumTier {
        return this.data.premiumTier as GuildPremiumTier;
    }

    public get premiumSubscriptionCount(): number | null | undefined {
        return this.data.premiumSubscriptionCount;
    }

    public get widgetEnabled(): boolean {
        return Boolean(this.data.widgetEnabled);
    }

    public get widgetChannelId(): string | null | undefined {
        return this.data.widgetChannelId;
    }

    public get explicitContentFilter(): GuildExplicitContentFilter {
        return this.data.explicitContentFilter as GuildExplicitContentFilter;
    }

    public get mfaLevel(): GuildMFALevel {
        return this.data.mfaLevel as GuildMFALevel;
    }

    public get createdTimestamp(): number {
        return Number(DiscordSnowflake.deconstruct(this.id).timestamp);
    }

    public get createdAt(): Date {
        return new Date(this.createdTimestamp);
    }

    public get defaultMessageNotifications(): GuildDefaultMessageNotifications {
        return this.data.defaultMessageNotifications as GuildDefaultMessageNotifications;
    }

    public get maximumMembers(): number | null | undefined {
        return this.data.maxMembers;
    }

    public get maximumPresences(): number | null | undefined {
        return this.data.maxMembers;
    }

    public get maxVideoChannelUsers(): number | null | undefined {
        return this.data.maxVideoChannelUsers;
    }

    public get approximateMemberCount(): number | null | undefined {
        return this.data.approximateMemberCount;
    }

    public get rulesChannelId(): string | null | undefined {
        return this.data.rulesChannelId;
    }

    public get publicUpdatesChannelId(): string | null | undefined {
        return this.data.publicUpdatesChannelId;
    }

    public get ownerId(): string | null | undefined {
        return this.data.ownerId;
    }

    public get icon(): string | null | undefined {
        return this.data.icon;
    }

    public get banner(): string | null | undefined {
        return this.data.banner;
    }

    public bannerURL(options?: BaseImageURLOptions): string | null | undefined {
        return this.banner && this.client.rest.cdn.banner(this.id, this.banner, options);
    }

    public iconURL(options?: BaseImageURLOptions): string | null | undefined {
        return this.icon && this.client.rest.cdn.icon(this.id, this.icon, options);
    }

    public discoverySplashURL(options?: BaseImageURLOptions): string | null {
        return this.discoverySplash && this.client.rest.cdn.discoverySplash(this.id, this.discoverySplash, options);
    }

    public get maximumBitrate(): 96_000 | 128_000 | 256_000 | 384_000 {
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
