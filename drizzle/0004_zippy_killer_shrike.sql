ALTER TABLE `users` ADD `stripeSecretKey` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `stripePublishableKey` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeConnected` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pricingUnitMinutes` int DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pricingAmount` int DEFAULT 300 NOT NULL;