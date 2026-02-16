-- ============================================
-- SUNBOX MAURITIUS - Pool BOQ System Migration
-- ============================================
-- This migration extends the BOQ system to support pool models
-- with configurable calculation variables, a centralized price
-- list, formula-driven quantities, sub-categories, and
-- reusable BOQ templates.
-- ============================================

-- ============================================
-- TABLE: pool_boq_variables
-- Configurable calculation variables for pool dimensions
-- Formulas reference pool dimensions (longueur, largeur, profondeur)
-- or other variable names for chained calculations.
-- ============================================
CREATE TABLE IF NOT EXISTS pool_boq_variables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT '',
    formula TEXT NOT NULL COMMENT 'Formula using other variable names or pool dimensions (longueur, largeur, profondeur)',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Default pool calculation variables
-- ============================================
INSERT IGNORE INTO pool_boq_variables (name, label, unit, formula, display_order) VALUES
('surface_m2',          'Surface M2',           'm²',    'longueur * largeur',                               1),
('volume_m3',           'Volume M3',            'm³',    'surface_m2 * profondeur',                          2),
('perimetre_m',         'Périmètre M',          'm',     'longueur * 2 + largeur * 2',                       3),
('perimetre_base_m',    'Périmètre Base M',     'm',     '(longueur + 1) * 2 + (largeur + 1) * 2',          4),
('surface_base_m2',     'Surface Base M2',      'm²',    '(longueur + 1) * (largeur + 1)',                   5),
('epaisseur_base_m',    'Épaisseur Base M',     'm',     '0.25',                                             6),
('volume_base_m3',      'Volume Base M3',       'm³',    'epaisseur_base_m * surface_base_m2',               7),
('nombre_blocs_bab',    'Nombre de Blocs BAB',  'blocs', '(perimetre_m / 0.4) * (profondeur / 0.2)',         8),
('surface_interieur_m2','Surface Intérieur M2', 'm²',    'perimetre_m * profondeur + surface_m2',            9);

-- ============================================
-- TABLE: pool_boq_price_list
-- Centralized price list for materials and labor
-- used across pool BOQ lines.
-- ============================================
CREATE TABLE IF NOT EXISTS pool_boq_price_list (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(100) NOT NULL DEFAULT 'unité',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    has_vat BOOLEAN DEFAULT TRUE,
    supplier_id INT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_display_order (display_order),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Default price list (Mauritius Rupees)
-- ============================================
INSERT IGNORE INTO pool_boq_price_list (name, unit, unit_price, has_vat, display_order) VALUES
-- Labor & transport (NO VAT)
('Main d''oeuvre (1 jour)',                      'jour',      2500.00, FALSE,  1),
('Transport Matériaux',                          'unité',     4500.00, FALSE,  2),
('Location JCB (1 jour)',                        'jour',     10000.00, FALSE,  3),
('Location Dammeuse (1 jour)',                   'jour',      2500.00, FALSE,  4),
-- Aggregates & steel (VAT)
('Crusherrun',                                   'tonne',     1200.00, TRUE,   5),
('Fer Y12 (barre de 9m)',                        'barre',      850.00, TRUE,   6),
('Fer Y10 (barre de 9m)',                        'barre',      650.00, TRUE,   7),
('Fer Y8 (barre de 5.8m)',                       'barre',      350.00, TRUE,   8),
-- Formwork & fixings (VAT)
('Plastique noir',                               'unité',      500.00, TRUE,   9),
('Bois de coffrage (Planche de 2.4m x 15cm)',   'planche',    250.00, TRUE,  10),
('Clous (forfait)',                              'forfait',    500.00, TRUE,  11),
('Fer d''attache (forfait)',                     'forfait',    300.00, TRUE,  12),
-- Concrete & mortar materials (VAT)
('Macadam 3/8 (tonne)',                          'tonne',     1800.00, TRUE,  13),
('Ciment (sac de 25kg)',                         'sac',        280.00, TRUE,  14),
('Rocksand .4 (tonne)',                          'tonne',     1100.00, TRUE,  15),
('Rocksand .2 (tonne)',                          'tonne',     1200.00, TRUE,  16),
('Colle Ciment (sac de 15Kg)',                   'sac',        350.00, TRUE,  17),
('Latex (Bouteille de 5 Lts)',                   'bouteille',  800.00, TRUE,  18),
-- Waterproofing (VAT)
('TAL Sureproof (kit)',                          'kit',       4500.00, TRUE,  19),
('Pekay Noir',                                   'm²',         350.00, TRUE,  20),
-- Ready-mix concrete & water
('Béton Toupie',                                 'm³',        5500.00, TRUE,  21),
('Eau Béton (Forfait)',                          'forfait',   2000.00, FALSE, 22),
-- Pool fittings (VAT)
('Skimmer',                                      'unité',     3500.00, TRUE,  23),
('Traversée de Parois',                          'unité',     2500.00, TRUE,  24),
('Tuyaux 50mm Haute Pression',                   'unité',      850.00, TRUE,  25),
('Colle PVC (Forfait)',                          'forfait',    500.00, TRUE,  26),
-- Electrical (VAT except labor)
('Câbles électriques 2.5mm2 3 cors',            'mètre',       45.00, TRUE,  27),
('Boite de connexion electrique',                'unité',      350.00, TRUE,  28),
('Spot Led',                                     'unité',     2500.00, TRUE,  29),
-- Consumables (VAT)
('Nylon (forfait)',                              'forfait',    200.00, TRUE,  30),
('Pinceau (forfait)',                            'forfait',    300.00, TRUE,  31),
-- Masonry (VAT)
('Bloc BAB',                                     'unité',       35.00, TRUE,  32),
-- Tiling (VAT / NO VAT for labor)
('Carrelage',                                    'm²',         800.00, TRUE,  33),
('Carreleur',                                    'm²',         400.00, FALSE, 34),
('Colle Carreau (sac de 15Kg)',                  'sac',        450.00, TRUE,  35),
('Tiles Spacers (forfait)',                      'forfait',    200.00, TRUE,  36),
('Joints (1 Kg)',                                'kg',         250.00, TRUE,  37),
-- Equipment (VAT)
('Pompe de Circulation',                         'unité',    15000.00, TRUE,  38),
('Domotique',                                    'unité',    25000.00, TRUE,  39),
('Filtre à Sable',                               'unité',    18000.00, TRUE,  40),
('Pompe de Piscine',                             'unité',    12000.00, TRUE,  41),
('Panneau Electrique',                           'unité',     8000.00, TRUE,  42),
-- Specialist labor (NO VAT)
('Electricien',                                  'jour',      3000.00, FALSE, 43),
('Plombier',                                     'jour',      3000.00, FALSE, 44),
-- Pool systems (VAT)
('Salt Chlorinateur',                            'unité',    35000.00, TRUE,  45),
('Buses',                                        'unité',     1500.00, TRUE,  46),
('Tuyau Spot Led',                               'unité',      450.00, TRUE,  47);

-- ============================================
-- ALTER: boq_categories - add parent_id for sub-categories
-- ============================================
ALTER TABLE boq_categories
    ADD COLUMN IF NOT EXISTS parent_id INT NULL AFTER model_id;

-- Add FK only if it does not already exist
DROP PROCEDURE IF EXISTS _add_fk_boq_categories_parent;
DELIMITER //
CREATE PROCEDURE _add_fk_boq_categories_parent()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_NAME = 'fk_boq_categories_parent'
          AND TABLE_NAME = 'boq_categories'
          AND TABLE_SCHEMA = DATABASE()
    ) THEN
        ALTER TABLE boq_categories
            ADD CONSTRAINT fk_boq_categories_parent
            FOREIGN KEY (parent_id) REFERENCES boq_categories(id) ON DELETE CASCADE;
    END IF;
END //
DELIMITER ;
CALL _add_fk_boq_categories_parent();
DROP PROCEDURE IF EXISTS _add_fk_boq_categories_parent;

-- ============================================
-- ALTER: boq_lines - add quantity_formula and price_list_id
-- ============================================
ALTER TABLE boq_lines
    ADD COLUMN IF NOT EXISTS quantity_formula TEXT NULL AFTER quantity;

ALTER TABLE boq_lines
    ADD COLUMN IF NOT EXISTS price_list_id INT NULL AFTER unit_cost_ht;

-- Add FK only if it does not already exist
DROP PROCEDURE IF EXISTS _add_fk_boq_lines_price_list;
DELIMITER //
CREATE PROCEDURE _add_fk_boq_lines_price_list()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_NAME = 'fk_boq_lines_price_list'
          AND TABLE_NAME = 'boq_lines'
          AND TABLE_SCHEMA = DATABASE()
    ) THEN
        ALTER TABLE boq_lines
            ADD CONSTRAINT fk_boq_lines_price_list
            FOREIGN KEY (price_list_id) REFERENCES pool_boq_price_list(id) ON DELETE SET NULL;
    END IF;
END //
DELIMITER ;
CALL _add_fk_boq_lines_price_list();
DROP PROCEDURE IF EXISTS _add_fk_boq_lines_price_list;

-- ============================================
-- TABLE: pool_boq_templates
-- Reusable BOQ template configurations that can be
-- cloned to new pool models.
-- ============================================
CREATE TABLE IF NOT EXISTS pool_boq_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- END OF POOL BOQ MIGRATION
-- ============================================
SELECT 'Pool BOQ Migration completed successfully!' AS Status;
