-- ============================================
-- SUNBOX MAURITIUS - Option Category Description Migration
-- ============================================
-- This migration adds a description field to option_categories table
-- to support displaying category descriptions in the configure page
-- ============================================

-- Add description column to option_categories table if it doesn't exist
ALTER TABLE option_categories
ADD COLUMN IF NOT EXISTS description TEXT AFTER name;

-- ============================================
-- END OF MIGRATION
-- ============================================
SELECT 'Option Category Description Migration completed!' AS Status;
