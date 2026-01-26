-- Add unique constraint on (user_id, key) to prevent duplicate settings
CREATE UNIQUE INDEX `idx_settings_user_key` ON `settings` (`user_id`, `key`);
--> statement-breakpoint

-- Clamp existing timelinePrevDays values to 0-999 range
UPDATE `settings`
SET `value` = CASE
  WHEN CAST(`value` AS INTEGER) < 0 THEN '0'
  WHEN CAST(`value` AS INTEGER) > 999 THEN '999'
  ELSE `value`
END
WHERE `key` = 'timelinePrevDays'
  AND (CAST(`value` AS INTEGER) < 0 OR CAST(`value` AS INTEGER) > 999);
--> statement-breakpoint

-- Clamp existing timelineNextDays values to 0-999 range
UPDATE `settings`
SET `value` = CASE
  WHEN CAST(`value` AS INTEGER) < 0 THEN '0'
  WHEN CAST(`value` AS INTEGER) > 999 THEN '999'
  ELSE `value`
END
WHERE `key` = 'timelineNextDays'
  AND (CAST(`value` AS INTEGER) < 0 OR CAST(`value` AS INTEGER) > 999);
