DROP TABLE `max_pricing_periods`;--> statement-breakpoint
DROP TABLE `parking_lots`;--> statement-breakpoint
DROP TABLE `parking_records`;--> statement-breakpoint
DROP TABLE `parking_spaces`;--> statement-breakpoint
DROP TABLE `paymentMethods`;--> statement-breakpoint
DROP TABLE `payment_records`;--> statement-breakpoint
DROP TABLE `payoutSchedules`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_customUrl_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `phone`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripeSecretKey`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripePublishableKey`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripeConnected`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripeAccountId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripeOnboardingComplete`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `squareAccessToken`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `squareMerchantId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `squareLocationId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `squareRefreshToken`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `squareConnected`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `paypayApiKey`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `paypayApiSecret`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `paypayMerchantId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `paypayConnected`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `cardPaymentProvider`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `pricingUnitMinutes`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `pricingAmount`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `bankName`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `branchName`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `accountType`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `accountNumber`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `accountHolder`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `customUrl`;