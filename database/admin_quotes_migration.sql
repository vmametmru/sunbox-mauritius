-- ============================================
-- SUNBOX MAURITIUS - Admin Quotes Migration
-- ============================================
-- This migration adds support for admin-created quotes:
-- - Free-form quotes (like BOQ with categories and lines)
-- - Cloning existing quotes
-- - New status workflow: draft → open → validated → cancelled
-- - Photo and plan URL support
-- ============================================

-- ============================================
-- ALTER quotes table for admin quote features
-- ============================================

-- Add is_free_quote flag to distinguish free quotes from model-based
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS is_free_quote BOOLEAN DEFAULT FALSE COMMENT 'True for free-form quotes created by admin';

-- Add photo_url and plan_url for quote visuals
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500) NULL COMMENT 'Optional photo URL for the quote';

ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS plan_url VARCHAR(500) NULL COMMENT 'Optional plan/blueprint URL for the quote';

-- Add margin_percent for free quotes
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5, 2) DEFAULT 30.00 COMMENT 'Margin percentage for free quotes';

-- Add cloned_from_id to track quote cloning
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS cloned_from_id INT NULL COMMENT 'Reference to original quote if cloned';

-- Add quote_title for free quotes (descriptive name)
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS quote_title VARCHAR(255) NULL COMMENT 'Custom title for free quotes';

-- Modify status enum to include new statuses
-- Note: MySQL requires recreating the column to modify ENUM values
-- Keep 'pending' as default for backward compatibility with existing public quote flow
ALTER TABLE quotes 
MODIFY COLUMN status ENUM('draft', 'open', 'validated', 'cancelled', 'pending', 'approved', 'rejected', 'completed') DEFAULT 'pending';

-- Add index for cloned_from_id
ALTER TABLE quotes 
ADD INDEX IF NOT EXISTS idx_cloned_from (cloned_from_id);

-- Add index for is_free_quote
ALTER TABLE quotes 
ADD INDEX IF NOT EXISTS idx_is_free_quote (is_free_quote);

-- ============================================
-- TABLE: quote_categories (Categories for free-form quotes)
-- Similar to boq_categories but for individual quotes
-- ============================================
CREATE TABLE IF NOT EXISTS quote_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quote_id (quote_id),
    INDEX idx_display_order (display_order),
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: quote_lines (Lines for free-form quotes)
-- Similar to boq_lines but for individual quotes
-- ============================================
CREATE TABLE IF NOT EXISTS quote_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'unité' COMMENT 'Unit of measure (unité, m², m³, kg, etc.)',
    unit_cost_ht DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT 'Unit cost excluding tax',
    margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 30.00 COMMENT 'Margin percentage, default 30%',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_id (category_id),
    INDEX idx_display_order (display_order),
    FOREIGN KEY (category_id) REFERENCES quote_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIEW: v_quote_lines_with_calculations
-- Auto-calculates: total_cost_ht, sale_price_ht for quote lines
-- ============================================
CREATE OR REPLACE VIEW v_quote_lines_with_calculations AS
SELECT 
    ql.*,
    qc.name AS category_name,
    qc.quote_id,
    -- Coût Total HT = Quantité × Coût Unitaire HT
    ROUND(ql.quantity * ql.unit_cost_ht, 2) AS total_cost_ht,
    -- Prix de Vente HT = Coût Total HT × (1 + Marge / 100)
    ROUND(ql.quantity * ql.unit_cost_ht * (1 + ql.margin_percent / 100), 2) AS sale_price_ht
FROM quote_lines ql
JOIN quote_categories qc ON ql.category_id = qc.id;

-- ============================================
-- VIEW: v_quote_category_totals
-- Summary per category with totals
-- ============================================
CREATE OR REPLACE VIEW v_quote_category_totals AS
SELECT 
    qc.id AS category_id,
    qc.quote_id,
    qc.name AS category_name,
    qc.display_order,
    COALESCE(SUM(ROUND(ql.quantity * ql.unit_cost_ht, 2)), 0) AS total_cost_ht,
    COALESCE(SUM(ROUND(ql.quantity * ql.unit_cost_ht * (1 + ql.margin_percent / 100), 2)), 0) AS total_sale_price_ht,
    COALESCE(SUM(ROUND(ql.quantity * ql.unit_cost_ht * (1 + ql.margin_percent / 100), 2)), 0) - 
    COALESCE(SUM(ROUND(ql.quantity * ql.unit_cost_ht, 2)), 0) AS total_profit_ht
FROM quote_categories qc
LEFT JOIN quote_lines ql ON qc.id = ql.category_id
GROUP BY qc.id, qc.quote_id, qc.name, qc.display_order
ORDER BY qc.display_order ASC;

-- ============================================
-- VIEW: v_quote_totals
-- Calculates total quote price from all categories
-- ============================================
CREATE OR REPLACE VIEW v_quote_totals AS
SELECT 
    quote_id,
    SUM(total_sale_price_ht) AS calculated_total_price,
    SUM(total_cost_ht) AS total_cost,
    SUM(total_profit_ht) AS total_profit
FROM v_quote_category_totals
GROUP BY quote_id;

-- ============================================
-- END OF ADMIN QUOTES MIGRATION
-- ============================================
SELECT 'Admin Quotes Migration completed successfully!' AS Status;
