ALTER TABLE "members" DROP CONSTRAINT "members_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_guild_id_guilds_id_fk";
--> statement-breakpoint
ALTER TABLE "member_roles" DROP CONSTRAINT "member_roles_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "member_roles" DROP CONSTRAINT "member_roles_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "member_roles" DROP CONSTRAINT "member_roles_guild_id_guilds_id_fk";
--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_guild_id_guilds_id_fk";
--> statement-breakpoint
ALTER TABLE "channels_overwrite" DROP CONSTRAINT "channels_overwrite_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "voice_states" DROP CONSTRAINT "voice_states_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "voice_states" DROP CONSTRAINT "voice_states_guild_id_guilds_id_fk";
--> statement-breakpoint
ALTER TABLE "voice_states" DROP CONSTRAINT "voice_states_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_author_id_users_id_fk";
--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'members'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "members" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "guild_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "member_roles" ALTER COLUMN "member_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "member_roles" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "member_roles" ALTER COLUMN "guild_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "guild_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "channels_overwrite" ALTER COLUMN "channel_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "channel_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "author_id" SET NOT NULL;