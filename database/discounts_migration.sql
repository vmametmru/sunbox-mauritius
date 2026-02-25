-- Migration: Add discounts tables
-- Allows individual or global discounts for container/pool models between 2 dates
-- Discount can apply to base price HT, options HT, or both

CREATE TABLE IF NOT EXISTS `discounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_type` enum('percentage','fixed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percentage' COMMENT 'percentage = % off, fixed = fixed amount off',
  `discount_value` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Percentage (e.g. 10 for 10%) or fixed amount in Rs',
  `apply_to` enum('base_price','options','both') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'both' COMMENT 'Apply to base price HT, options HT, or both',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `discount_models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `discount_id` int NOT NULL,
  `model_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_discount_model` (`discount_id`,`model_id`),
  KEY `idx_discount_models_discount` (`discount_id`),
  KEY `idx_discount_models_model` (`model_id`),
  CONSTRAINT `fk_dm_discount` FOREIGN KEY (`discount_id`) REFERENCES `discounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dm_model` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
