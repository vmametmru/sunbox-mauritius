-- Pro Themes Migration
-- Creates the professional_themes table and adds theme_id to professional_profiles.

-- 1. Pro themes table (admin-managed presets)
CREATE TABLE IF NOT EXISTS professional_themes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT 'Nouveau Thème',
    -- Logo
    logo_position ENUM('left','center','right') NOT NULL DEFAULT 'left',
    -- Header
    header_height ENUM('small','medium','large','hero') NOT NULL DEFAULT 'medium',
    header_bg_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    header_text_color VARCHAR(20) NOT NULL DEFAULT '#1A365D',
    -- Typography
    font_family VARCHAR(100) NOT NULL DEFAULT 'Inter',
    -- Navigation
    nav_position ENUM('left','center','right') NOT NULL DEFAULT 'right',
    nav_has_background TINYINT(1) NOT NULL DEFAULT 1,
    nav_bg_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    nav_text_color VARCHAR(20) NOT NULL DEFAULT '#1A365D',
    nav_hover_color VARCHAR(20) NOT NULL DEFAULT '#F97316',
    -- Buttons & accents
    button_color VARCHAR(20) NOT NULL DEFAULT '#F97316',
    button_text_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    -- Footer
    footer_bg_color VARCHAR(20) NOT NULL DEFAULT '#1A365D',
    footer_text_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    -- Metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Insert default theme (mirrors the current Sunbox public layout exactly)
INSERT IGNORE INTO professional_themes (id, name, logo_position, header_height, header_bg_color, header_text_color, font_family, nav_position, nav_has_background, nav_bg_color, nav_text_color, nav_hover_color, button_color, button_text_color, footer_bg_color, footer_text_color)
VALUES (1, 'Thème Sunbox (Défaut)', 'left', 'medium', '#FFFFFF', '#1A365D', 'Inter', 'right', 1, '#FFFFFF', '#1A365D', '#F97316', '#F97316', '#FFFFFF', '#1A365D', '#FFFFFF');

-- 3. Add theme_id to professional_profiles (idempotent)
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'professional_profiles'
      AND COLUMN_NAME = 'theme_id'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `professional_profiles` ADD COLUMN `theme_id` INT NULL DEFAULT NULL AFTER `is_active`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;
