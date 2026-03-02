-- Purchase Reports migration for Sunbox main DB
-- Run once to add purchase report tables to the Sunbox database.
-- Safe to re-run (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS `purchase_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quote_id` INT NOT NULL,
    `quote_reference` VARCHAR(50) DEFAULT '',
    `model_name` VARCHAR(255) DEFAULT '',
    `status` ENUM('in_progress','completed') DEFAULT 'in_progress',
    `total_amount` DECIMAL(12,2) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `purchase_report_items` (
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
    `display_order` INT DEFAULT 0,
    FOREIGN KEY (`report_id`) REFERENCES `purchase_reports`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
