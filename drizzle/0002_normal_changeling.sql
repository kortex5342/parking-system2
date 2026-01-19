ALTER TABLE `payment_records` ADD `stripePaymentIntentId` varchar(64);--> statement-breakpoint
ALTER TABLE `payment_records` ADD `isDemo` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeAccountId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeOnboardingComplete` boolean DEFAULT false NOT NULL;