-- Pro DB Config Migration (v3)
-- Admin only enters the database name; Sunbox server credentials are used at runtime.
-- This migration removes the now-unused db_host, db_user, db_pass_enc columns
-- and ensures db_name exists.
-- Safe to re-run (uses IF EXISTS / IF NOT EXISTS guards).

SET @db = DATABASE();

-- Ensure db_name column exists
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_name');
SET @sql = IF(@col = 0, 'ALTER TABLE professional_profiles ADD COLUMN db_name VARCHAR(255) NOT NULL DEFAULT \'\' COMMENT \'Pro site DB name\' AFTER api_token', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

-- Drop db_host if it exists (no longer used)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_host');
SET @sql = IF(@col > 0, 'ALTER TABLE professional_profiles DROP COLUMN db_host', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

-- Drop db_user if it exists (no longer used)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_user');
SET @sql = IF(@col > 0, 'ALTER TABLE professional_profiles DROP COLUMN db_user', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

-- Drop db_pass_enc if it exists (no longer used)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_pass_enc');
SET @sql = IF(@col > 0, 'ALTER TABLE professional_profiles DROP COLUMN db_pass_enc', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;
