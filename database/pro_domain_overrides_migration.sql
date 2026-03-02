-- Pro Domain, API Token & Model Overrides Migration
-- Adds domain validation and per-model price/visibility overrides

-- 1. Add domain + api_token to professional_profiles
ALTER TABLE professional_profiles
    ADD COLUMN domain VARCHAR(255) DEFAULT NULL COMMENT 'Pro site domain (e.g. poolbuilder.mu)' AFTER is_active,
    ADD COLUMN api_token VARCHAR(64) DEFAULT NULL COMMENT 'Unique API token for Sunbox bridge auth' AFTER domain;

-- 2. Index for fast token + domain lookup
CREATE INDEX idx_pp_api_token ON professional_profiles(api_token);
CREATE INDEX idx_pp_domain ON professional_profiles(domain);

-- 3. Pro model overrides table (stored on main Sunbox DB, applied when serving models to pro sites)
CREATE TABLE IF NOT EXISTS pro_model_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'professional user id',
    model_id INT NOT NULL COMMENT 'reference to models.id on main Sunbox DB',
    price_adjustment DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Rs amount to add (positive) or subtract (negative) from base price',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = hidden on pro site',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_model (user_id, model_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
