-- ============================================
-- SUNBOX MAURITIUS - BOQ System Migration
-- ============================================
-- This migration adds support for Bill of Quantities (BOQ)
-- for pricing container models and options
-- ============================================

-- ============================================
-- TABLE: suppliers (Fournisseurs)
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: boq_categories (Catégories de BOQ)
-- Ex: Fondations, Structure, Toit, Électricité...
-- ============================================
CREATE TABLE IF NOT EXISTS boq_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_option BOOLEAN DEFAULT FALSE COMMENT 'If true, this category appears as an option for the model',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_model_id (model_id),
    INDEX idx_is_option (is_option),
    INDEX idx_display_order (display_order),
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: boq_lines (Lignes de BOQ)
-- Ex: Location machine, transport, main d'oeuvre...
-- ============================================
CREATE TABLE IF NOT EXISTS boq_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'unité' COMMENT 'Unit of measure (unité, m², m³, kg, etc.)',
    unit_cost_ht DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT 'Unit cost excluding tax',
    supplier_id INT NULL,
    margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 30.00 COMMENT 'Margin percentage, default 30%',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_id (category_id),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_display_order (display_order),
    FOREIGN KEY (category_id) REFERENCES boq_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIEW: v_boq_lines_with_calculations
-- Auto-calculates: total_cost_ht, sale_price_ht
-- ============================================
CREATE OR REPLACE VIEW v_boq_lines_with_calculations AS
SELECT 
    bl.*,
    s.name AS supplier_name,
    bc.name AS category_name,
    bc.model_id,
    bc.is_option,
    -- Coût Total HT = Quantité × Coût Unitaire HT
    ROUND(bl.quantity * bl.unit_cost_ht, 2) AS total_cost_ht,
    -- Prix de Vente HT = Coût Total HT × (1 + Marge / 100)
    ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2) AS sale_price_ht
FROM boq_lines bl
JOIN boq_categories bc ON bl.category_id = bc.id
LEFT JOIN suppliers s ON bl.supplier_id = s.id;

-- ============================================
-- VIEW: v_boq_category_totals
-- Summary per category with totals
-- ============================================
CREATE OR REPLACE VIEW v_boq_category_totals AS
SELECT 
    bc.id AS category_id,
    bc.model_id,
    bc.name AS category_name,
    bc.is_option,
    bc.display_order,
    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht, 2)), 0) AS total_cost_ht,
    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2)), 0) AS total_sale_price_ht,
    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2)), 0) - 
    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht, 2)), 0) AS total_profit_ht
FROM boq_categories bc
LEFT JOIN boq_lines bl ON bc.id = bl.category_id
GROUP BY bc.id, bc.model_id, bc.name, bc.is_option, bc.display_order
ORDER BY bc.display_order ASC;

-- ============================================
-- VIEW: v_model_boq_base_price
-- Calculates model base price from non-option BOQ categories
-- ============================================
CREATE OR REPLACE VIEW v_model_boq_base_price AS
SELECT 
    model_id,
    SUM(total_sale_price_ht) AS calculated_base_price_ht,
    SUM(total_cost_ht) AS total_cost_ht,
    SUM(total_profit_ht) AS total_profit_ht
FROM v_boq_category_totals
WHERE is_option = FALSE
GROUP BY model_id;

-- ============================================
-- Sample data: Default suppliers
-- ============================================
INSERT INTO suppliers (name, city, phone, email) VALUES
('Fournisseur Général', 'Port Louis', '+230 123 4567', 'contact@fournisseur.mu'),
('ABC Construction', 'Curepipe', '+230 234 5678', 'info@abc-construction.mu'),
('Électricité Plus', 'Quatre Bornes', '+230 345 6789', 'elec@plus.mu'),
('Plomberie Pro', 'Phoenix', '+230 456 7890', 'contact@plomberiepro.mu');

-- ============================================
-- END OF BOQ MIGRATION
-- ============================================
SELECT 'BOQ Migration completed successfully!' AS Status;
