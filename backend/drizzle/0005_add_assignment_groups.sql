-- Create assignment_groups table for storing priority and comments for contiguous assignment ranges
CREATE TABLE `assignment_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_assignment_id` integer NOT NULL REFERENCES `project_assignments`(`id`) ON DELETE CASCADE,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`comment` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

-- Create indexes for efficient lookups
CREATE INDEX `idx_assignment_groups_project_assignment` ON `assignment_groups` (`project_assignment_id`);
CREATE INDEX `idx_assignment_groups_dates` ON `assignment_groups` (`start_date`, `end_date`);
