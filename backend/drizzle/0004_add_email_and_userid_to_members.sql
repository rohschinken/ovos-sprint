-- Add email and userId columns to team_members table
ALTER TABLE `team_members` ADD `user_id` integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE `team_members` ADD `email` text;
