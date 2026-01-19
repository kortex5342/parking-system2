CREATE TABLE `max_pricing_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parkingLotId` int NOT NULL,
	`startHour` int NOT NULL,
	`endHour` int NOT NULL,
	`maxAmount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `max_pricing_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `max_pricing_periods` ADD CONSTRAINT `max_pricing_periods_parkingLotId_parking_lots_id_fk` FOREIGN KEY (`parkingLotId`) REFERENCES `parking_lots`(`id`) ON DELETE cascade ON UPDATE no action;