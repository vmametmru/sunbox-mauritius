-- ============================================
-- SUNBOX MAURITIUS - Unforeseen Cost Migration
-- ============================================
-- Adds unforeseen_cost_percent column to models table.
-- This percentage is applied to the base HT price to account
-- for unforeseen/contingency costs. Default is 10%.
-- ============================================

DROP PROCEDURE IF EXISTS _add_col_models_unforeseen_cost;

DELIMITER //
CREATE PROCEDURE _add_col_models_unforeseen_cost()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'models'
          AND COLUMN_NAME  = 'unforeseen_cost_percent'
    ) THEN
        ALTER TABLE models
            ADD COLUMN unforeseen_cost_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00
            COMMENT 'Unforeseen cost percentage applied to base HT price'
            AFTER base_price;
    END IF;
END //
DELIMITER ;

CALL _add_col_models_unforeseen_cost();
DROP PROCEDURE IF EXISTS _add_col_models_unforeseen_cost;

SELECT 'Unforeseen cost migration completed!' AS Status;
