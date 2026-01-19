CREATE TABLE `paymentMethods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lotId` int NOT NULL,
	`method` enum('paypay','rakuten_pay','line_pay','apple_pay','ic_card','credit_card') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`apiKey` varchar(256),
	`apiSecret` varchar(256),
	`merchantId` varchar(64),
	`feePercentage` decimal(5,2) NOT NULL DEFAULT '0',
	`feeFixed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentMethods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payoutSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`lotId` int NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`payoutDeadline` date NOT NULL,
	`totalAmount` int NOT NULL DEFAULT 0,
	`status` enum('pending','scheduled','completed','failed') NOT NULL DEFAULT 'pending',
	`payoutDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payoutSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `paymentMethods` ADD CONSTRAINT `paymentMethods_lotId_parking_lots_id_fk` FOREIGN KEY (`lotId`) REFERENCES `parking_lots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payoutSchedules` ADD CONSTRAINT `payoutSchedules_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payoutSchedules` ADD CONSTRAINT `payoutSchedules_lotId_parking_lots_id_fk` FOREIGN KEY (`lotId`) REFERENCES `parking_lots`(`id`) ON DELETE cascade ON UPDATE no action;