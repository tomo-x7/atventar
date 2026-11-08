CREATE TABLE `records` (
	`uri` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`collection` text NOT NULL,
	`cid` text,
	`rev` text NOT NULL,
	`record` text,
	`indexed_at` text NOT NULL,
	`year` integer,
	`title` text,
	`description` text,
	`calendar_uri` text,
	`day` integer
);
--> statement-breakpoint
CREATE INDEX `records_collection_order` ON `records` (`collection`,`indexed_at`,`uri`);--> statement-breakpoint
CREATE INDEX `records_author_order` ON `records` (`did`,`collection`,`indexed_at`,`uri`);--> statement-breakpoint
CREATE INDEX `records_calendar_day` ON `records` (`calendar_uri`,`day`,`indexed_at`,`uri`);--> statement-breakpoint
CREATE INDEX `records_year` ON `records` (`year`);