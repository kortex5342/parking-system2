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
	`maxDailyAmountEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parking_lots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parking_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parkingLotId` int,
	`spaceId` int NOT NULL,
	`spaceNumber` int NOT NULL,
	`entryTime` bigint NOT NULL,
	`exitTime` bigint,
	`status` enum('active','completed') NOT NULL DEFAULT 'active',
	`sessionToken` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parking_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `parking_records_sessionToken_unique` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `parking_spaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parkingLotId` int,
	`spaceNumber` int NOT NULL,
	`status` enum('available','occupied') NOT NULL DEFAULT 'available',
	`qrCode` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parking_spaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `parking_spaces_qrCode_unique` UNIQUE(`qrCode`)
);
--> statement-breakpoint
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
CREATE TABLE `payment_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parkingLotId` int,
	`ownerId` int,
	`parkingRecordId` int NOT NULL,
	`spaceNumber` int NOT NULL,
	`entryTime` bigint NOT NULL,
	`exitTime` bigint NOT NULL,
	`durationMinutes` int NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` enum('paypay','credit_card','stripe','square') NOT NULL,
	`paymentStatus` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`transactionId` varchar(64),
	`stripePaymentIntentId` varchar(64),
	`squarePaymentId` varchar(64),
	`paypayPaymentId` varchar(64),
	`isDemo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_records_id` PRIMARY KEY(`id`)
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
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','owner','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('pending','active','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSecretKey` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `stripePublishableKey` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeConnected` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeAccountId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeOnboardingComplete` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `squareAccessToken` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `squareMerchantId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `squareLocationId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `squareRefreshToken` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `squareConnected` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `paypayApiKey` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `paypayApiSecret` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `paypayMerchantId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `paypayConnected` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `cardPaymentProvider` enum('stripe','square');--> statement-breakpoint
ALTER TABLE `users` ADD `pricingUnitMinutes` int DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pricingAmount` int DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bankName` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `branchName` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `accountType` enum('checking','savings');--> statement-breakpoint
ALTER TABLE `users` ADD `accountNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `accountHolder` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `customUrl` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_customUrl_unique` UNIQUE(`customUrl`);--> statement-breakpoint
ALTER TABLE `max_pricing_periods` ADD CONSTRAINT `max_pricing_periods_parkingLotId_parking_lots_id_fk` FOREIGN KEY (`parkingLotId`) REFERENCES `parking_lots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentMethods` ADD CONSTRAINT `paymentMethods_lotId_parking_lots_id_fk` FOREIGN KEY (`lotId`) REFERENCES `parking_lots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payoutSchedules` ADD CONSTRAINT `payoutSchedules_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payoutSchedules` ADD CONSTRAINT `payoutSchedules_lotId_parking_lots_id_fk` FOREIGN KEY (`lotId`) REFERENCES `parking_lots`(`id`) ON DELETE cascade ON UPDATE no action;