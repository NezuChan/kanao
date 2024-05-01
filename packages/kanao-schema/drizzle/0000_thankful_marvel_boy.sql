CREATE TABLE IF NOT EXISTS "members" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text,
	"nick" text,
	"avatar" text,
	"flags" integer,
	"joined_at" text,
	"premium_since" text,
	"deaf" boolean,
	"mute" boolean,
	"pending" boolean,
	"communication_disabled_until" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"discriminator" text,
	"global_name" text,
	"avatar" text,
	"bot" boolean,
	"flags" integer,
	"premium_type" integer,
	"public_flags" integer,
	"avatar_decoration" text,
	"locale" text,
	"accent_color" integer,
	"banner" text,
	"mfa_enabled" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_roles" (
	"member_id" text NOT NULL,
	"role_id" text NOT NULL,
	"guild_id" text NOT NULL,
	CONSTRAINT "member_roles_member_id_role_id_pk" PRIMARY KEY("member_id","role_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"color" integer,
	"hoist" boolean,
	"position" integer,
	"permissions" text,
	"guild_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"unavailable" boolean,
	"name" text,
	"icon" text,
	"icon_hash" text,
	"splash" text,
	"discovery_splash" text,
	"owner" boolean,
	"owner_id" text,
	"permissions" text,
	"region" text,
	"afk_channel_id" text,
	"afk_timeout" integer,
	"widget_enabled" boolean,
	"widget_channel_id" text,
	"verification_level" integer,
	"default_message_notifications" integer,
	"explicit_content_filter" integer,
	"mfa_level" integer,
	"system_channel_id" text,
	"system_channel_flags" integer,
	"rules_channel_id" text,
	"max_presences" integer,
	"max_members" integer,
	"vanity_url_code" text,
	"description" text,
	"banner" text,
	"premium_tier" integer,
	"premium_subscription_count" integer,
	"preferred_locale" text,
	"public_updates_channel_id" text,
	"max_video_channel_users" integer,
	"approximate_member_count" integer,
	"approximate_presence_count" integer,
	"nsfw_level" integer,
	"premium_progress_bar_enabled" boolean,
	"safety_alert_channel_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"type" integer,
	"position" integer,
	"name" text,
	"topic" text,
	"nsfw" boolean,
	"last_message_id" text,
	"bitrate" integer,
	"user_limit" integer,
	"rate_limit_per_user" integer,
	"icon" text,
	"owner_id" text,
	"parent_id" text,
	"last_pin_timestamp" text,
	"rtc_region" text,
	"video_quality_mode" integer,
	"message_count" integer,
	"default_auto_archive_duration" integer,
	"flags" integer,
	"guild_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channels_overwrite" (
	"user_or_role" text,
	"channel_id" text,
	"type" integer,
	"allow" text,
	"deny" text,
	CONSTRAINT "channels_overwrite_channel_id_user_or_role_pk" PRIMARY KEY("channel_id","user_or_role")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voice_states" (
	"guild_id" text NOT NULL,
	"member_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"session_id" text,
	"deaf" boolean,
	"mute" boolean,
	"self_deaf" boolean,
	"self_mute" boolean,
	"self_stream" boolean,
	"self_video" boolean,
	"suppress" boolean,
	"request_to_speak_timestamp" text,
	CONSTRAINT "voice_states_guild_id_member_id_pk" PRIMARY KEY("guild_id","member_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"author_id" text NOT NULL,
	"guild_id" text,
	"content" text,
	"timestamp" text,
	"edited_timestamp" text,
	"tts" boolean,
	"mention_everyone" boolean,
	"nonce" text,
	"pinned" boolean,
	"webhook_id" text,
	"type" integer,
	"application_id" text,
	"flags" integer,
	"position" integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "members_guildId_idx" ON "members" ("guild_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_roles_guildId_idx" ON "member_roles" ("guild_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_guildId_idx" ON "roles" ("guild_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_guildId_idx" ON "channels" ("guild_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_overwrite_actorId_idx" ON "channels_overwrite" ("user_or_role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voice_states_channelId_idx" ON "voice_states" ("channel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voice_states_sessionId_idx" ON "voice_states" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_guildId_idx" ON "messages" ("guild_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_channelId_idx" ON "messages" ("channel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_authorId_idx" ON "messages" ("author_id");