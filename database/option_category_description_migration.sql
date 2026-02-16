-- ============================================
-- SUNBOX MAURITIUS - Option Category Description Migration
-- ============================================
-- This migration adds a description field to option_categories table
-- to support displaying category descriptions in the configure page
-- ============================================

-- Add description column to option_categories table if it doesn't exist
DROP PROCEDURE IF EXISTS _add_col_option_categories_description;
DELIMITER //
CREATE PROCEDURE _add_col_option_categories_description()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'option_categories'
          AND COLUMN_NAME = 'description'
    ) THEN
        ALTER TABLE option_categories
            ADD COLUMN description TEXT AFTER name;
    END IF;
END //
DELIMITER ;
CALL _add_col_option_categories_description();
DROP PROCEDURE IF EXISTS _add_col_option_categories_description;

-- ============================================
-- END OF MIGRATION
-- ============================================
SELECT 'Option Category Description Migration completed!' AS Status;
