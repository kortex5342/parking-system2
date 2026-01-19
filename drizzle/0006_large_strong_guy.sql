ALTER TABLE `users` ADD `bankName` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `branchName` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `accountType` enum('checking','savings');--> statement-breakpoint
ALTER TABLE `users` ADD `accountNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `accountHolder` varchar(100);