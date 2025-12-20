-- Create customers table
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint

-- Extract unique customers from existing projects and insert into customers table
INSERT INTO customers (name, icon, created_at)
SELECT DISTINCT customer, NULL, CURRENT_TIMESTAMP
FROM projects
WHERE customer IS NOT NULL AND customer != ''
ORDER BY customer;
--> statement-breakpoint

-- Create new projects table with customer_id foreign key
CREATE TABLE `projects_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'tentative' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Migrate data from old projects table to new one
INSERT INTO projects_new (id, customer_id, name, status, created_at)
SELECT
  p.id,
  c.id as customer_id,
  p.name,
  p.status,
  p.created_at
FROM projects p
JOIN customers c ON c.name = p.customer;
--> statement-breakpoint

-- Update milestone foreign keys to point to new projects table
-- SQLite doesn't support ALTER TABLE for foreign keys, so we recreate milestones
CREATE TABLE `milestones_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`date` text NOT NULL,
	`name` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects_new`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Copy milestone data
INSERT INTO milestones_new SELECT * FROM milestones;
--> statement-breakpoint

-- Update project_assignments foreign keys
CREATE TABLE `project_assignments_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`team_member_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects_new`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_member_id`) REFERENCES `team_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Copy project assignment data
INSERT INTO project_assignments_new SELECT * FROM project_assignments;
--> statement-breakpoint

-- Drop old tables
DROP TABLE milestones;
--> statement-breakpoint
DROP TABLE project_assignments;
--> statement-breakpoint
DROP TABLE projects;
--> statement-breakpoint

-- Rename new tables
ALTER TABLE projects_new RENAME TO projects;
--> statement-breakpoint
ALTER TABLE milestones_new RENAME TO milestones;
--> statement-breakpoint
ALTER TABLE project_assignments_new RENAME TO project_assignments;
