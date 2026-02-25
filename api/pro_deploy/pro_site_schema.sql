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
    `model_id` INT NOT NULL,
    `model_name` VARCHAR(255) NOT NULL,
    `base_price` DECIMAL(12,2) DEFAULT 0,
    `options_total` DECIMAL(12,2) DEFAULT 0,
    `total_price` DECIMAL(12,2) NOT NULL,
    `notes` TEXT,
    `status` ENUM('pending','approved','rejected','completed') DEFAULT 'pending',
    `valid_until` DATE DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

-- Add 'company' to pro_contacts if missing
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pro_contacts'
      AND COLUMN_NAME = 'company'
);
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_contacts` ADD COLUMN `company` VARCHAR(255) DEFAULT `""` AFTER `address`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

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
