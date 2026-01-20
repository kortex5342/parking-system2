ALTER TABLE `payment_records` MODIFY COLUMN `paymentMethod` enum('paypay','credit_card','stripe','square','line_pay','rakuten_pay','apple_pay') NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_records` ADD `linePayTransactionId` varchar(64);--> statement-breakpoint
ALTER TABLE `payment_records` ADD `rakutenPayOrderId` varchar(64);