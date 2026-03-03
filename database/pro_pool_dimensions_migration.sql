-- Migration: add pool dimensions to pro_quotes table
-- Safe to run multiple times (uses IF NOT EXISTS column checks).
-- Run this against each pro-user database (e.g. mauriti2_sunbox_mauritius_bcreative).

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_shape');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_shape` VARCHAR(20) DEFAULT NULL AFTER `boq_requested`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_longueur');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_longueur` DECIMAL(8,2) DEFAULT NULL AFTER `pool_shape`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_largeur');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_largeur` DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_profondeur');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_profondeur` DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_longueur_la');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_longueur_la` DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_largeur_la');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_largeur_la` DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_la`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_profondeur_la');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_profondeur_la` DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_la`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_longueur_lb');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_longueur_lb` DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur_la`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_largeur_lb');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_largeur_lb` DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_lb`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_profondeur_lb');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_profondeur_lb` DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_lb`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_longueur_ta');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_longueur_ta` DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur_lb`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_largeur_ta');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_largeur_ta` DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_ta`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_profondeur_ta');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_profondeur_ta` DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_ta`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_longueur_tb');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_longueur_tb` DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur_ta`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_largeur_tb');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_largeur_tb` DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_tb`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'pool_profondeur_tb');
SET @sql = IF(@col_exists > 0, 'SELECT 1', 'ALTER TABLE `pro_quotes` ADD COLUMN `pool_profondeur_tb` DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_tb`');
PREPARE _stmt FROM @sql; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;
