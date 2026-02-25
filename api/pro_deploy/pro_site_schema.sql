-- Pro Site Database Schema
-- Import this into your pro site's own MySQL database

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Settings table
CREATE TABLE IF NOT EXISTS `pro_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` TEXT,
    `setting_group` VARCHAR(50) DEFAULT 'general',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contacts (pro's own clients)
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

-- Quotes (pro's own quotes)
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

-- Default settings
INSERT INTO `pro_settings` (`setting_key`, `setting_value`, `setting_group`) VALUES
('vat_rate', '15', 'general'),
('site_under_construction', 'false', 'site'),
('company_name', '{{COMPANY_NAME}}', 'company'),
('company_address', '', 'company'),
('company_phone', '', 'company'),
('company_email', '', 'company'),
('vat_number', '', 'company'),
('brn_number', '', 'company')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

COMMIT;
