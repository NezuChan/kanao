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
CREATE TABLE IF NOT EXISTS "guild_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text,
	"role_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" text,
	"role_id" text,
	"guild_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"color" integer,
	"hoist" boolean,
	"position" integer,
	"permissions" text
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
	"id" serial PRIMARY KEY NOT NULL,
	"user_or_role" text,
	"channel_id" text,
	"type" integer,
	"allow" text,
	"deny" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voice_states" (
	"member_id" text PRIMARY KEY NOT NULL,
	"guild_id" text,
	"channel_id" text,
	"session_id" text,
	"deaf" boolean,
	"mute" boolean,
	"self_deaf" boolean,
	"self_mute" boolean,
	"self_stream" boolean,
	"self_video" boolean,
	"suppress" boolean,
	"request_to_speak_timestamp" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text,
	"author_id" text,
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
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" integer PRIMARY KEY NOT NULL,
	"resume_url" text NOT NULL,
	"sequence" integer NOT NULL,
	"session_id" text NOT NULL,
	"shardCount" integer NOT NULL,
	CONSTRAINT "sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "status" (
	"shard_id" integer PRIMARY KEY NOT NULL,
	"latency" integer,
	"last_ack" text,
	"status" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members" ADD CONSTRAINT "members_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members" ADD CONSTRAINT "members_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guild_roles" ADD CONSTRAINT "guild_roles_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guild_roles" ADD CONSTRAINT "guild_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels" ADD CONSTRAINT "channels_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels_overwrite" ADD CONSTRAINT "channels_overwrite_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voice_states" ADD CONSTRAINT "voice_states_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voice_states" ADD CONSTRAINT "voice_states_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voice_states" ADD CONSTRAINT "voice_states_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
