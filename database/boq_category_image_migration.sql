-- ============================================
-- SUNBOX MAURITIUS - BOQ Category Image Migration
-- ============================================
-- This migration adds support for images on BOQ categories
-- When a BOQ category is marked as an option (is_option = true),
-- it can have an associated image for display in the configurator
-- ============================================

-- Add image_id column to boq_categories table if it doesn't exist
DROP PROCEDURE IF EXISTS _add_col_boq_categories_image_id;
DELIMITER //
CREATE PROCEDURE _add_col_boq_categories_image_id()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'boq_categories'
          AND COLUMN_NAME = 'image_id'
    ) THEN
        ALTER TABLE boq_categories
            ADD COLUMN image_id INT NULL AFTER is_option;
    END IF;
END //
DELIMITER ;
CALL _add_col_boq_categories_image_id();
DROP PROCEDURE IF EXISTS _add_col_boq_categories_image_id;

-- Add FK only if it does not already exist
DROP PROCEDURE IF EXISTS _add_fk_boq_categories_image;
DELIMITER //
CREATE PROCEDURE _add_fk_boq_categories_image()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_NAME = 'fk_boq_categories_image'
          AND TABLE_NAME = 'boq_categories'
          AND TABLE_SCHEMA = DATABASE()
    ) THEN
        ALTER TABLE boq_categories
            ADD CONSTRAINT fk_boq_categories_image
            FOREIGN KEY (image_id) REFERENCES model_images(id) ON DELETE SET NULL;
    END IF;
END //
DELIMITER ;
CALL _add_fk_boq_categories_image();
DROP PROCEDURE IF EXISTS _add_fk_boq_categories_image;

-- ============================================
-- END OF MIGRATION
-- ============================================
SELECT 'BOQ Category Image Migration completed!' AS Status;
