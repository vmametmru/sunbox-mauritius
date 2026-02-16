-- ============================================
-- SUNBOX MAURITIUS - Option Category Image Migration
-- ============================================
-- This migration adds support for images on option categories
-- Images can be tagged "category_image" when uploaded
-- ============================================

-- Step 1: Add 'category_image' to the model_images.media_type ENUM
-- This allows uploading images specifically for option categories
-- Note: We're appending 'category_image' to the end of the existing ENUM values,
-- which is the safe way to extend an ENUM in MySQL without affecting existing data.
ALTER TABLE model_images
MODIFY COLUMN media_type ENUM('photo', 'plan', 'bandeau', 'category_image') 
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'photo';

-- Step 2: Add image_id column to option_categories table if it doesn't exist
DROP PROCEDURE IF EXISTS _add_col_option_categories_image_id;
DELIMITER //
CREATE PROCEDURE _add_col_option_categories_image_id()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'option_categories'
          AND COLUMN_NAME = 'image_id'
    ) THEN
        ALTER TABLE option_categories
            ADD COLUMN image_id INT NULL AFTER description;
    END IF;
END //
DELIMITER ;
CALL _add_col_option_categories_image_id();
DROP PROCEDURE IF EXISTS _add_col_option_categories_image_id;

-- Add FK only if it does not already exist
DROP PROCEDURE IF EXISTS _add_fk_option_categories_image;
DELIMITER //
CREATE PROCEDURE _add_fk_option_categories_image()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_NAME = 'fk_option_categories_image'
          AND TABLE_NAME = 'option_categories'
          AND TABLE_SCHEMA = DATABASE()
    ) THEN
        ALTER TABLE option_categories
            ADD CONSTRAINT fk_option_categories_image
            FOREIGN KEY (image_id) REFERENCES model_images(id) ON DELETE SET NULL;
    END IF;
END //
DELIMITER ;
CALL _add_fk_option_categories_image();
DROP PROCEDURE IF EXISTS _add_fk_option_categories_image;

-- ============================================
-- END OF MIGRATION
-- ============================================
SELECT 'Option Category Image Migration completed!' AS Status;
