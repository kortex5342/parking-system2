CREATE TABLE `parking_records` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`spaceNumber` int NOT NULL,
	`status` enum('available','occupied') NOT NULL DEFAULT 'available',
	`qrCode` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parking_spaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `parking_spaces_spaceNumber_unique` UNIQUE(`spaceNumber`),
	CONSTRAINT `parking_spaces_qrCode_unique` UNIQUE(`qrCode`)
);
--> statement-breakpoint
CREATE TABLE `payment_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parkingRecordId` int NOT NULL,
	`spaceNumber` int NOT NULL,
	`entryTime` bigint NOT NULL,
	`exitTime` bigint NOT NULL,
	`durationMinutes` int NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` enum('paypay','credit_card') NOT NULL,
	`paymentStatus` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`transactionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_records_id` PRIMARY KEY(`id`)
);
