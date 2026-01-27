CREATE TABLE `daily_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`summaryDate` varchar(10) NOT NULL,
	`reflection` text,
	`tomorrowPlan` text,
	`aiAnalysis` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `daily_summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`quadrant` enum('priority','strategic','trivial','trap') NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`notes` text,
	`taskDate` varchar(10) NOT NULL,
	`isCarriedOver` boolean NOT NULL DEFAULT false,
	`originalDate` varchar(10),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `daily_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`promptContent` text NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `prompt_templates_id` PRIMARY KEY(`id`)
);
