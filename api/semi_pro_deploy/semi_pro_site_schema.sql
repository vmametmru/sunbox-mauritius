-- Semi-Pro Site Shared Database Schema
-- ONE shared database for ALL semi-pro users.
-- Every table includes a `user_id` column to identify which semi-pro user owns the record.
-- Safe to run on both a FRESH install and an EXISTING install.
-- All statements use IF NOT EXISTS / ON DUPLICATE KEY UPDATE patterns.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ── Settings table (shared, global) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `semi_pro_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` TEXT,
    `setting_group` VARCHAR(50) DEFAULT 'general',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Contacts (per semi-pro user) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `semi_pro_contacts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) DEFAULT '',
    `phone` VARCHAR(50) DEFAULT '',
    `address` TEXT,
    `company` VARCHAR(255) DEFAULT '',
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Quotes (per semi-pro user) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `semi_pro_quotes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `reference_number` VARCHAR(50) NOT NULL,
    `contact_id` INT DEFAULT NULL,
    `customer_name` VARCHAR(255) DEFAULT '',
    `customer_email` VARCHAR(255) DEFAULT '',
    `customer_phone` VARCHAR(50) DEFAULT '',
    `customer_address` TEXT,
    `customer_message` TEXT,
    `model_id` INT NOT NULL,
    `model_name` VARCHAR(255) NOT NULL,
    `model_type` VARCHAR(50) DEFAULT 'container',
    `base_price` DECIMAL(12,2) DEFAULT 0,
    `options_total` DECIMAL(12,2) DEFAULT 0,
    `total_price` DECIMAL(12,2) NOT NULL,
    `notes` TEXT,
    `status` ENUM('draft','open','validated','cancelled','pending','approved','rejected','completed') DEFAULT 'open',
    `approval_token` VARCHAR(64) DEFAULT NULL,
    `valid_until` DATE DEFAULT NULL,
    -- Pool dimensions
    `pool_longueur_la`   DECIMAL(8,2) DEFAULT NULL,
    `pool_largeur_la`    DECIMAL(8,2) DEFAULT NULL,
    `pool_profondeur_la` DECIMAL(8,2) DEFAULT NULL,
    `pool_longueur_lb`   DECIMAL(8,2) DEFAULT NULL,
    `pool_largeur_lb`    DECIMAL(8,2) DEFAULT NULL,
    `pool_profondeur_lb` DECIMAL(8,2) DEFAULT NULL,
    `pool_longueur_ta`   DECIMAL(8,2) DEFAULT NULL,
    `pool_largeur_ta`    DECIMAL(8,2) DEFAULT NULL,
    `pool_profondeur_ta` DECIMAL(8,2) DEFAULT NULL,
    `pool_longueur_tb`   DECIMAL(8,2) DEFAULT NULL,
    `pool_largeur_tb`    DECIMAL(8,2) DEFAULT NULL,
    `pool_profondeur_tb` DECIMAL(8,2) DEFAULT NULL,
    -- Modular/custom dimensions
    `modular_longueur`   DECIMAL(8,2) DEFAULT NULL,
    `modular_largeur`    DECIMAL(8,2) DEFAULT NULL,
    `modular_nb_etages`  INT          DEFAULT NULL,
    `custom_dimensions`  JSON         DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_user_id` (`user_id`),
    KEY `idx_reference` (`reference_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Quote options (selected options per quote) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `semi_pro_quote_options` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quote_id` INT NOT NULL,
    `option_id` INT DEFAULT NULL,
    `option_name` VARCHAR(500) NOT NULL,
    `option_price` DECIMAL(12,2) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`quote_id`) REFERENCES `semi_pro_quotes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Purchase/BOQ Reports (per semi-pro user) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `semi_pro_purchase_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `quote_id` INT NOT NULL,
    `quote_reference` VARCHAR(50) DEFAULT '',
    `model_name` VARCHAR(255) DEFAULT '',
    `status` ENUM('in_progress','completed') DEFAULT 'in_progress',
    `total_amount` DECIMAL(12,2) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_user_id` (`user_id`),
    FOREIGN KEY (`quote_id`) REFERENCES `semi_pro_quotes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `semi_pro_purchase_report_items` (
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
    FOREIGN KEY (`report_id`) REFERENCES `semi_pro_purchase_reports`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Email templates (shared) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `semi_pro_email_templates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `template_key` VARCHAR(100) NOT NULL,
    `template_type` ENUM('quote','notification','contact','status_change','other') NOT NULL DEFAULT 'other',
    `name` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(500) NOT NULL,
    `body_html` LONGTEXT NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_template_key` (`template_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Schema version ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `semi_pro_schema_version` (
    `id`         INT NOT NULL DEFAULT 1,
    `version`    VARCHAR(20) NOT NULL,
    `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `semi_pro_schema_version` (`id`, `version`)
VALUES (1, '1.0.0')
ON DUPLICATE KEY UPDATE `version` = '1.0.0', `applied_at` = NOW();

-- ── Default settings ───────────────────────────────────────────────────────────
INSERT INTO `semi_pro_settings` (`setting_key`, `setting_value`, `setting_group`)
VALUES
    ('vat_rate',         '15',    'general'),
    ('company_name',     '',      'company'),
    ('company_address',  '',      'company'),
    ('company_phone',    '',      'company'),
    ('company_email',    '',      'company'),
    ('vat_number',       '',      'company'),
    ('brn_number',       '',      'company')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
