-- Cleanup Migration: Remove encrypted DB credential columns from professional_profiles
--
-- The previous approach stored DB credentials encrypted in professional_profiles.
-- The new approach auto-provisions a database named mauriti2_sunbox_mauritius_<domain>
-- using the same server credentials — no per-user DB config stored in main DB.
--
-- Run this migration if you applied the previous pro_db_config_migration.sql.

SET @db = DATABASE();

-- Drop db_host if it exists
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_host');
SET @sql = IF(@col > 0, 'ALTER TABLE professional_profiles DROP COLUMN db_host', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

-- Drop db_name if it exists
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_name');
SET @sql = IF(@col > 0, 'ALTER TABLE professional_profiles DROP COLUMN db_name', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

-- Drop db_user if it exists
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_user');
SET @sql = IF(@col > 0, 'ALTER TABLE professional_profiles DROP COLUMN db_user', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

-- Drop db_pass_enc if it exists
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_pass_enc');
SET @sql = IF(@col > 0, 'ALTER TABLE professional_profiles DROP COLUMN db_pass_enc', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;
