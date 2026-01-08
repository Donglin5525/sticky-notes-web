CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT '',
	`content` text,
	`color` enum('yellow','green','blue','pink','purple','orange') NOT NULL DEFAULT 'yellow',
	`isImportant` boolean NOT NULL DEFAULT false,
	`isUrgent` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`tags` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
