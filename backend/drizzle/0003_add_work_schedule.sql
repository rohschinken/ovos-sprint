-- Add work_schedule column to team_members table
ALTER TABLE team_members ADD COLUMN work_schedule TEXT NOT NULL DEFAULT '{"sun":false,"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false}';
