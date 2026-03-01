-- Cleanup Migration: Remove wrong pro_users table
--
-- A previous Copilot PR (copilot/fix-pro-db-encryption-key-error, PR #96)
-- mistakenly created a standalone `pro_users` table to store professional
-- users outside the main `users` table. That approach was incorrect.
--
-- The correct implementation (this PR, copilot/add-professional-quotation-interface)
-- uses the existing `users` table with role='professional', linked to the
-- `professional_profiles` table which holds company-specific data.
--
-- Run this migration if you accidentally applied the pro_users_migration.sql
-- from PR #96 on your database.

DROP TABLE IF EXISTS `pro_users`;
