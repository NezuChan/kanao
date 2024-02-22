CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY NOT NULL,
	`resume_url` text NOT NULL,
	`sequence` integer NOT NULL,
	`session_id` text NOT NULL,
	`shardCount` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `status` (
	`shard_id` integer PRIMARY KEY NOT NULL,
	`latency` integer,
	`last_ack` text,
	`status` integer
);
