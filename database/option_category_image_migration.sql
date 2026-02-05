-- ============================================
-- SUNBOX MAURITIUS - Option Category Image Migration
-- ============================================
-- This migration adds support for images on option categories
-- Images can be tagged "category_image" when uploaded
-- ============================================

-- Add image_id column to option_categories table if it doesn't exist
ALTER TABLE option_categories
ADD COLUMN IF NOT EXISTS image_id INT NULL AFTER description,
ADD CONSTRAINT fk_option_categories_image 
    FOREIGN KEY (image_id) REFERENCES model_images(id) ON DELETE SET NULL;

-- ============================================
-- END OF MIGRATION
-- ============================================
SELECT 'Option Category Image Migration completed!' AS Status;
