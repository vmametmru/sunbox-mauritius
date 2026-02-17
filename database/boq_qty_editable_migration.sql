-- ============================================
-- SUNBOX MAURITIUS - BOQ Qty Editable Migration
-- ============================================
-- Adds qty_editable column to boq_categories table
-- When true, the public configurator shows a quantity input
-- for that option sub-category, and multiplies costs by qty.
-- ============================================

DROP PROCEDURE IF EXISTS _add_col_boq_categories_qty_editable;

DELIMITER //
CREATE PROCEDURE _add_col_boq_categories_qty_editable()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'boq_categories'
          AND COLUMN_NAME  = 'qty_editable'
    ) THEN
        ALTER TABLE boq_categories
            ADD COLUMN qty_editable BOOLEAN NOT NULL DEFAULT FALSE
            COMMENT 'If true, quantity is editable on the public configurator'
            AFTER is_option;
    END IF;
END //
DELIMITER ;

CALL _add_col_boq_categories_qty_editable();
DROP PROCEDURE IF EXISTS _add_col_boq_categories_qty_editable;

SELECT 'BOQ qty_editable migration completed!' AS Status;
