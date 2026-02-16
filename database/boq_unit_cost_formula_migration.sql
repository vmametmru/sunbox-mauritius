-- ============================================
-- SUNBOX MAURITIUS - BOQ Unit Cost Formula Migration
-- ============================================
-- Adds unit_cost_formula column to boq_lines table
-- to support formula-driven unit cost calculations
-- using pool variables (longueur, largeur, profondeur, etc.)
-- ============================================

DROP PROCEDURE IF EXISTS _add_col_boq_lines_unit_cost_formula;
DELIMITER //
CREATE PROCEDURE _add_col_boq_lines_unit_cost_formula()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'boq_lines'
          AND COLUMN_NAME = 'unit_cost_formula'
    ) THEN
        ALTER TABLE boq_lines
            ADD COLUMN unit_cost_formula TEXT NULL AFTER unit_cost_ht;
    END IF;
END //
DELIMITER ;
CALL _add_col_boq_lines_unit_cost_formula();
DROP PROCEDURE IF EXISTS _add_col_boq_lines_unit_cost_formula;

-- ============================================
-- END OF BOQ UNIT COST FORMULA MIGRATION
-- ============================================
SELECT 'BOQ Unit Cost Formula Migration completed successfully!' AS Status;
