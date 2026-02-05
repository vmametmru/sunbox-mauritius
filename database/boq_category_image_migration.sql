-- ============================================
-- SUNBOX MAURITIUS - BOQ Category Image Migration
-- ============================================
-- This migration adds support for images on BOQ categories
-- When a BOQ category is marked as an option (is_option = true),
-- it can have an associated image for display in the configurator
-- ============================================

-- Add image_id column to boq_categories table if it doesn't exist
ALTER TABLE boq_categories
ADD COLUMN IF NOT EXISTS image_id INT NULL AFTER is_option,
ADD CONSTRAINT fk_boq_categories_image 
    FOREIGN KEY (image_id) REFERENCES model_images(id) ON DELETE SET NULL;

-- ============================================
-- END OF MIGRATION
-- ============================================
SELECT 'BOQ Category Image Migration completed!' AS Status;
