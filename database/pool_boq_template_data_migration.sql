-- ============================================
-- SUNBOX MAURITIUS - Pool BOQ Template Data Migration
-- ============================================
-- This migration adds a template_data JSON column to
-- pool_boq_templates so that the full template structure
-- (categories, subcategories, lines with formulas) is
-- stored in the database instead of localStorage.
-- ============================================

-- Add template_data column to pool_boq_templates
DROP PROCEDURE IF EXISTS _add_col_pool_boq_templates_data;
DELIMITER //
CREATE PROCEDURE _add_col_pool_boq_templates_data()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pool_boq_templates'
          AND COLUMN_NAME = 'template_data'
    ) THEN
        ALTER TABLE pool_boq_templates
            ADD COLUMN template_data JSON NULL AFTER is_default;
    END IF;
END //
DELIMITER ;
CALL _add_col_pool_boq_templates_data();
DROP PROCEDURE IF EXISTS _add_col_pool_boq_templates_data;

SELECT 'Pool BOQ Template Data Migration completed successfully!' AS Status;
