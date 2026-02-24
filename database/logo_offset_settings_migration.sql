-- Migration: Add PDF logo offset settings
-- Run once on the production database.
-- Uses ON DUPLICATE KEY UPDATE so it is safe to re-run.

INSERT INTO `settings` (`setting_key`, `setting_value`, `setting_group`)
VALUES
  ('pdf_logo_offset_left',   '0', 'pdf'),
  ('pdf_logo_offset_right',  '0', 'pdf'),
  ('pdf_logo_offset_top',    '0', 'pdf'),
  ('pdf_logo_offset_bottom', '0', 'pdf')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value);
