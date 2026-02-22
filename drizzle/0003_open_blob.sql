CREATE TABLE `habit_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`habitId` int NOT NULL,
	`value` text NOT NULL,
	`note` text,
	`timestamp` bigint NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `habit_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('count','value') NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isArchived` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `habits_id` PRIMARY KEY(`id`)
);
