-- Pro Site Database Schema
-- Safe to run on both a FRESH install and an EXISTING install.
-- All statements use IF NOT EXISTS / ON DUPLICATE KEY UPDATE patterns.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ── Settings table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `pro_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` TEXT,
    `setting_group` VARCHAR(50) DEFAULT 'general',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Contacts (pro's own clients) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `pro_contacts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) DEFAULT '',
    `phone` VARCHAR(50) DEFAULT '',
    `address` TEXT,
    `company` VARCHAR(255) DEFAULT '',
    `device_id` VARCHAR(255) DEFAULT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Quotes (pro's own quotes) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `pro_quotes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `reference_number` VARCHAR(50) NOT NULL,
    `contact_id` INT DEFAULT NULL,
    `customer_name` VARCHAR(255) DEFAULT '',
    `customer_email` VARCHAR(255) DEFAULT '',
    `customer_phone` VARCHAR(50) DEFAULT '',
    `customer_address` TEXT,
    `customer_message` TEXT,
    `model_id` INT NOT NULL,
    `model_name` VARCHAR(255) NOT NULL,
    `model_type` VARCHAR(20) DEFAULT 'container',
    `base_price` DECIMAL(12,2) DEFAULT 0,
    `options_total` DECIMAL(12,2) DEFAULT 0,
    `total_price` DECIMAL(12,2) NOT NULL,
    `notes` TEXT,
    `status` ENUM('pending','approved','rejected','completed') DEFAULT 'pending',
    `valid_until` DATE DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Quote options (selected options per pro quote) ─────────────────────────────
CREATE TABLE IF NOT EXISTS `pro_quote_options` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quote_id` INT NOT NULL,
    `option_id` INT DEFAULT NULL,
    `option_name` VARCHAR(500) NOT NULL,
    `option_price` DECIMAL(12,2) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`quote_id`) REFERENCES `pro_quotes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Upgrade block: add columns to existing tables if they are missing ──────────
-- Compatible with MySQL 5.7+ and MariaDB 10.2+

-- Add 'notes' to pro_quotes if missing (older installs)
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_quotes'
      AND COLUMN_NAME = 'notes'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `notes` TEXT AFTER `total_price`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- Add 'valid_until' to pro_quotes if missing
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_quotes'
      AND COLUMN_NAME = 'valid_until'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `valid_until` DATE DEFAULT NULL AFTER `status`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- Add 'customer_address' to pro_quotes if missing
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_quotes'
      AND COLUMN_NAME = 'customer_address'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `customer_address` TEXT AFTER `customer_phone`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- Add 'customer_message' to pro_quotes if missing
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_quotes'
      AND COLUMN_NAME = 'customer_message'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `customer_message` TEXT AFTER `customer_address`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- Add 'model_type' to pro_quotes if missing
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_quotes'
      AND COLUMN_NAME = 'model_type'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `model_type` VARCHAR(20) DEFAULT ''container'' AFTER `model_name`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- Add 'company' to pro_contacts if missing
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_contacts'
      AND COLUMN_NAME = 'company'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_contacts` ADD COLUMN `company` VARCHAR(255) DEFAULT '' AFTER `address`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- Add 'device_id' to pro_contacts if missing
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_contacts'
      AND COLUMN_NAME = 'device_id'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_contacts` ADD COLUMN `device_id` VARCHAR(255) DEFAULT NULL AFTER `company`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- ── Discounts (pro's own promotional discounts) ───────────────────────────────
CREATE TABLE IF NOT EXISTS `pro_discounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `discount_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    `discount_value` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `apply_to` ENUM('base_price', 'options', 'both') NOT NULL DEFAULT 'both',
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `model_ids` JSON DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Email templates (pro's own email templates) ────────────────────────────────
CREATE TABLE IF NOT EXISTS `pro_email_templates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `template_key` VARCHAR(100) NOT NULL,
    `template_type` ENUM('quote','notification','password_reset','contact','status_change','other') NOT NULL DEFAULT 'other',
    `name` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(500) NOT NULL,
    `body_html` LONGTEXT NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_template_key` (`template_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Email signatures (pro's own email signatures) ──────────────────────────────
CREATE TABLE IF NOT EXISTS `pro_email_signatures` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `signature_key` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `body_html` LONGTEXT NOT NULL,
    `logo_url` VARCHAR(500) DEFAULT '',
    `photo_url` VARCHAR(500) DEFAULT '',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_signature_key` (`signature_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Default settings (safe to re-run: ON DUPLICATE KEY UPDATE) ─────────────────
INSERT INTO `pro_settings` (`setting_key`, `setting_value`, `setting_group`) VALUES
('vat_rate',               '15',              'general'),
('site_under_construction', 'false',           'site'),
('company_name',           '{{COMPANY_NAME}}', 'company'),
('company_address',        '',                'company'),
('company_phone',          '',                'company'),
('company_email',          '',                'company'),
('vat_number',             '',                'company'),
('brn_number',             '',                'company')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- ── Schema version tracking ───────────────────────────────────────────────────
-- Single-row table. id=1 always. Inserted/updated by init_pro_db on each run.
CREATE TABLE IF NOT EXISTS `pro_schema_version` (
    `id`         INT NOT NULL DEFAULT 1,
    `version`    VARCHAR(20) NOT NULL,
    `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Purchase Reports (Rapport d'Achat) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `pro_purchase_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quote_id` INT NOT NULL,
    `quote_reference` VARCHAR(50) DEFAULT '',
    `model_name` VARCHAR(255) DEFAULT '',
    `status` ENUM('in_progress','completed') DEFAULT 'in_progress',
    `total_amount` DECIMAL(12,2) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`quote_id`) REFERENCES `pro_quotes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pro_purchase_report_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `report_id` INT NOT NULL,
    `supplier_name` VARCHAR(255) DEFAULT 'Fournisseur non défini',
    `category_name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(10,3) DEFAULT 1,
    `unit` VARCHAR(50) DEFAULT '',
    `unit_price` DECIMAL(12,2) DEFAULT 0,
    `total_price` DECIMAL(12,2) DEFAULT 0,
    `is_ordered` TINYINT(1) DEFAULT 0,
    `is_option` TINYINT(1) DEFAULT 0,
    `display_order` INT DEFAULT 0,
    FOREIGN KEY (`report_id`) REFERENCES `pro_purchase_reports`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add boq_requested to pro_quotes if missing
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_quotes'
      AND COLUMN_NAME = 'boq_requested'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `boq_requested` TINYINT(1) DEFAULT 0 AFTER `valid_until`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- Add is_option to pro_purchase_report_items if missing (v1.6.0 upgrade)
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_purchase_report_items'
      AND COLUMN_NAME = 'is_option'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_purchase_report_items` ADD COLUMN `is_option` TINYINT(1) DEFAULT 0 AFTER `is_ordered`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

INSERT INTO `pro_schema_version` (`id`, `version`) VALUES (1, '1.6.0')
ON DUPLICATE KEY UPDATE `version` = VALUES(`version`), `applied_at` = NOW();
