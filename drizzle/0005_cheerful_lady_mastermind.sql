CREATE TABLE `parking_lots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`address` text,
	`description` text,
	`totalSpaces` int NOT NULL DEFAULT 10,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`pricingUnitMinutes` int,
	`pricingAmount` int,
	`maxDailyAmount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parking_lots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `parking_spaces` DROP INDEX `parking_spaces_spaceNumber_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','owner','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `parking_records` ADD `parkingLotId` int;--> statement-breakpoint
ALTER TABLE `parking_spaces` ADD `parkingLotId` int;--> statement-breakpoint
ALTER TABLE `payment_records` ADD `parkingLotId` int;--> statement-breakpoint
ALTER TABLE `payment_records` ADD `ownerId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('pending','active','suspended') DEFAULT 'active' NOT NULL;