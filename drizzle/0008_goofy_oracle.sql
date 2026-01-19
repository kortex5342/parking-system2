ALTER TABLE `users` ADD `customUrl` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_customUrl_unique` UNIQUE(`customUrl`);