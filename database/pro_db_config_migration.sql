-- Pro DB Config Migration
-- Adds encrypted database credentials to professional_profiles
-- These are managed on Sunbox and fetched at runtime by the pro site.

ALTER TABLE professional_profiles
    ADD COLUMN db_host    VARCHAR(255) NOT NULL DEFAULT 'localhost' COMMENT 'Pro site DB host' AFTER api_token,
    ADD COLUMN db_name    VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Pro site DB name' AFTER db_host,
    ADD COLUMN db_user    VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Pro site DB username' AFTER db_name,
    ADD COLUMN db_pass_enc TEXT COMMENT 'AES-256-CBC encrypted DB password (key=PRO_DB_ENCRYPTION_KEY)' AFTER db_user;
