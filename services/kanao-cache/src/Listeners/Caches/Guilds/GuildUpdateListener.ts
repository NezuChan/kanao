import { guilds } from "@nezuchan/kanao-schema";
import type { GatewayGuildUpdateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { sql } from "drizzle-orm";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { DispatchListener } from "../DispatchListener.js";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildUpdate
        });
    }

    public async run(payload: { data: GatewayGuildUpdateDispatch; shardId: number; }): Promise<void> {
        await this.container.client.drizzle.insert(guilds).values({
            id: payload.data.d.id,
            name: payload.data.d.name,
            banner: payload.data.d.banner,
            owner: payload.data.d.owner,
            ownerId: payload.data.d.owner_id,
            afkChannelId: payload.data.d.afk_channel_id,
            afkTimeout: payload.data.d.afk_timeout,
            defaultMessageNotifications: payload.data.d.default_message_notifications,
            explicitContentFilter: payload.data.d.explicit_content_filter,
            icon: payload.data.d.icon,
            mfaLevel: payload.data.d.mfa_level,
            region: payload.data.d.region,
            systemChannelId: payload.data.d.system_channel_id,
            verificationLevel: payload.data.d.verification_level,
            widgetChannelId: payload.data.d.widget_channel_id,
            widgetEnabled: payload.data.d.widget_enabled,
            approximateMemberCount: payload.data.d.approximate_member_count,
            approximatePresenceCount: payload.data.d.approximate_presence_count,
            description: payload.data.d.description,
            discoverySplash: payload.data.d.discovery_splash,
            iconHash: payload.data.d.icon_hash,
            maxMembers: payload.data.d.max_members,
            maxPresences: payload.data.d.max_presences,
            premiumSubscriptionCount: payload.data.d.premium_subscription_count,
            premiumTier: payload.data.d.premium_tier,
            vanityUrlCode: payload.data.d.vanity_url_code,
            nsfwLevel: payload.data.d.nsfw_level,
            rulesChannelId: payload.data.d.rules_channel_id,
            publicUpdatesChannelId: payload.data.d.public_updates_channel_id,
            preferredLocale: payload.data.d.preferred_locale,
            maxVideoChannelUsers: payload.data.d.max_video_channel_users,
            permissions: payload.data.d.permissions,
            premiumProgressBarEnabled: payload.data.d.premium_progress_bar_enabled,
            safetyAlertChannelId: payload.data.d.safety_alerts_channel_id,
            splash: payload.data.d.splash,
            systemChannelFlags: payload.data.d.system_channel_flags
        }).onConflictDoUpdate({
            target: guilds.id,
            set: {
                name: sql`EXCLUDED.name`,
                banner: sql`EXCLUDED.banner`,
                owner: sql`EXCLUDED.owner`,
                ownerId: sql`EXCLUDED.owner_id`,
                afkChannelId: sql`EXCLUDED.afk_channel_id`,
                afkTimeout: sql`EXCLUDED.afk_timeout`,
                defaultMessageNotifications: sql`EXCLUDED.default_message_notifications`,
                explicitContentFilter: sql`EXCLUDED.explicit_content_filter`,
                icon: sql`EXCLUDED.icon`,
                mfaLevel: sql`EXCLUDED.mfa_level`,
                region: sql`EXCLUDED.region`,
                systemChannelId: sql`EXCLUDED.system_channel_id`,
                verificationLevel: sql`EXCLUDED.verification_level`,
                widgetChannelId: sql`EXCLUDED.widget_channel_id`,
                widgetEnabled: sql`EXCLUDED.widget_enabled`,
                approximateMemberCount: sql`EXCLUDED.approximate_member_count`,
                approximatePresenceCount: sql`EXCLUDED.approximate_presence_count`,
                description: sql`EXCLUDED.description`,
                discoverySplash: sql`EXCLUDED.discovery_splash`,
                iconHash: sql`EXCLUDED.icon_hash`,
                maxMembers: sql`EXCLUDED.max_members`,
                maxPresences: sql`EXCLUDED.max_presences`,
                premiumSubscriptionCount: sql`EXCLUDED.premium_subscription_count`,
                premiumTier: sql`EXCLUDED.premium_tier`,
                vanityUrlCode: sql`EXCLUDED.vanity_url_code`,
                nsfwLevel: sql`EXCLUDED.nsfw_level`,
                rulesChannelId: sql`EXCLUDED.rules_channel_id`,
                publicUpdatesChannelId: sql`EXCLUDED.public_updates_channel_id`,
                preferredLocale: sql`EXCLUDED.preferred_locale`,
                maxVideoChannelUsers: sql`EXCLUDED.max_video_channel_users`,
                permissions: sql`EXCLUDED.permissions`,
                premiumProgressBarEnabled: sql`EXCLUDED.premium_progress_bar_enabled`,
                safetyAlertChannelId: sql`EXCLUDED.safety_alert_channel_id`,
                splash: sql`EXCLUDED.splash`,
                systemChannelFlags: sql`EXCLUDED.system_channel_flags`
            }
        });

        await DispatchListener.dispatch(payload);
    }
}
