CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`study_id` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`duration` real NOT NULL,
	`position` integer NOT NULL,
	`object_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`study_id`) REFERENCES `studies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assets_study` ON `assets` (`study_id`,`position`);--> statement-breakpoint
CREATE TABLE `audio_parts` (
	`id` text PRIMARY KEY NOT NULL,
	`upload_id` text NOT NULL,
	`part_index` integer NOT NULL,
	`etag` text NOT NULL,
	`size` integer NOT NULL,
	FOREIGN KEY (`upload_id`) REFERENCES `audio_uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audio_part_identity` ON `audio_parts` (`upload_id`,`part_index`);--> statement-breakpoint
CREATE TABLE `audio_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`multipart_id` text NOT NULL,
	`object_key` text NOT NULL,
	`size` integer NOT NULL,
	`chunk_size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`study_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`research_code` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`study_id`) REFERENCES `studies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participants_token_hash_unique` ON `participants` (`token_hash`);--> statement-breakpoint
CREATE INDEX `participants_study` ON `participants` (`study_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studies` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`family_id` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`title_zh` text NOT NULL,
	`description` text NOT NULL,
	`description_zh` text NOT NULL,
	`consent` text NOT NULL,
	`consent_zh` text NOT NULL,
	`emotion_target` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studies_token_unique` ON `studies` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_family_version` ON `studies` (`family_id`,`version`);--> statement-breakpoint
CREATE TABLE `submission_parts` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`part_index` integer NOT NULL,
	`sha256` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_part_identity` ON `submission_parts` (`submission_id`,`part_index`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`study_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`session_id` text NOT NULL,
	`research_code` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`input_sha256` text NOT NULL,
	`package_sha256` text,
	`size` integer NOT NULL,
	`package_size` integer,
	`object_key` text NOT NULL,
	`coverage` real DEFAULT 0 NOT NULL,
	`event_count` integer DEFAULT 0 NOT NULL,
	`pass_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`study_id`) REFERENCES `studies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_list` ON `submissions` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `submissions_study` ON `submissions` (`study_id`,`asset_id`,`participant_id`);