-- Create password_resets table for storing password reset tokens
CREATE TABLE `password_resets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`token_hash` text NOT NULL UNIQUE,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

-- Create indexes for efficient lookups
CREATE UNIQUE INDEX `idx_password_resets_token_hash` ON `password_resets` (`token_hash`);
CREATE INDEX `idx_password_resets_user_id` ON `password_resets` (`user_id`);
CREATE INDEX `idx_password_resets_expires_at` ON `password_resets` (`expires_at`);
