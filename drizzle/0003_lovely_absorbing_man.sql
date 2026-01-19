ALTER TABLE `payment_records` MODIFY COLUMN `paymentMethod` enum('paypay','credit_card','stripe','square') NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_records` ADD `squarePaymentId` varchar(64);--> statement-breakpoint
ALTER TABLE `payment_records` ADD `paypayPaymentId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `squareAccessToken` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `squareMerchantId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `squareLocationId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `squareRefreshToken` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `squareConnected` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `paypayApiKey` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `paypayApiSecret` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `paypayMerchantId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `paypayConnected` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `cardPaymentProvider` enum('stripe','square');