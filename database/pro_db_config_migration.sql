-- Pro DB Config Migration (v2)
-- Admin manually creates the database in cPanel, then enters credentials here.
-- Credentials are stored with simple AES-256 encryption in professional_profiles.
-- Run this ONCE. Safe to re-run (uses IF NOT EXISTS guards).

SET @db = DATABASE();

-- Add db_host if missing
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_host');
SET @sql = IF(@col = 0, 'ALTER TABLE professional_profiles ADD COLUMN db_host VARCHAR(255) NOT NULL DEFAULT \'localhost\' COMMENT \'Pro site DB host\' AFTER api_token', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

-- Add db_name if missing
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_name');
SET @sql = IF(@col = 0, 'ALTER TABLE professional_profiles ADD COLUMN db_name VARCHAR(255) NOT NULL DEFAULT \'\' COMMENT \'Pro site DB name\' AFTER db_host', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

-- Add db_user if missing
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_user');
SET @sql = IF(@col = 0, 'ALTER TABLE professional_profiles ADD COLUMN db_user VARCHAR(255) NOT NULL DEFAULT \'\' COMMENT \'Pro site DB username\' AFTER db_name', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

-- Add db_pass_enc if missing
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'professional_profiles' AND COLUMN_NAME = 'db_pass_enc');
SET @sql = IF(@col = 0, 'ALTER TABLE professional_profiles ADD COLUMN db_pass_enc TEXT COMMENT \'AES-256-CBC encrypted DB password\' AFTER db_user', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;
