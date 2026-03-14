-- ============================================================
-- SUNBOX MAURITIUS - Modular BOQ System Migration
-- ============================================================
-- This migration adds support for the 'modular' BOQ tables
-- (modular_boq_variables, modular_boq_price_list, modular_boq_templates).
-- NOTE: The ENUM modification below (adding 'modular') is superseded by
-- the v2.11.0 migration in api/index.php which converts models.type
-- from ENUM to VARCHAR(50) to support unlimited admin-created types.
-- BOQ template tables — following the same pattern as Pool BOQ.
-- ============================================================

-- ============================================================
-- ALTER: models.type ENUM — add 'modular'
-- ============================================================
DROP PROCEDURE IF EXISTS _alter_models_type_modular;
DELIMITER //
CREATE PROCEDURE _alter_models_type_modular()
BEGIN
    DECLARE colType TEXT;
    SELECT COLUMN_TYPE INTO colType
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'models'
      AND COLUMN_NAME  = 'type';

    IF colType NOT LIKE '%modular%' THEN
        ALTER TABLE models
            MODIFY COLUMN type ENUM('container', 'pool', 'modular') NOT NULL;
    END IF;
END //
DELIMITER ;
CALL _alter_models_type_modular();
DROP PROCEDURE IF EXISTS _alter_models_type_modular;

-- ============================================================
-- TABLE: modular_boq_variables
-- Configurable calculation variables for modular home dimensions.
-- Formulas reference base dimensions (longueur, largeur, nombre_etages)
-- or other variable names for chained calculations.
-- ============================================================
CREATE TABLE IF NOT EXISTS modular_boq_variables (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    label         VARCHAR(255) NOT NULL,
    unit          VARCHAR(50)  DEFAULT '',
    formula       TEXT         NOT NULL COMMENT 'Formula using longueur, largeur, nombre_etages, or other variable names',
    display_order INT          DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name          (name),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Default modular calculation variables
-- ============================================================
INSERT IGNORE INTO modular_boq_variables (name, label, unit, formula, display_order) VALUES
('surface_plancher_m2', 'Surface Plancher M2',   'm²',  'longueur * largeur',                                      1),
('surface_totale_m2',   'Surface Totale M2',     'm²',  'surface_plancher_m2 * nombre_etages',                     2),
('perimetre_m',         'Périmètre M',           'm',   '(longueur + largeur) * 2',                                3),
('hauteur_etage_m',     'Hauteur Étage M',       'm',   '2.6',                                                     4),
('hauteur_totale_m',    'Hauteur Totale M',      'm',   'hauteur_etage_m * nombre_etages',                         5),
('surface_murs_m2',     'Surface Murs M2',       'm²',  'perimetre_m * hauteur_totale_m',                         6),
('surface_toiture_m2',  'Surface Toiture M2',    'm²',  'surface_plancher_m2 * 1.15',                              7),
('volume_m3',           'Volume M3',             'm³',  'surface_plancher_m2 * hauteur_totale_m',                  8),
('nb_portes',           'Nb Portes (estimation)','unité','ROUND(perimetre_m / 8)',                                  9),
('nb_fenetres',         'Nb Fenêtres (estimation)','unité','ROUND(surface_murs_m2 / 6)',                           10);

-- ============================================================
-- TABLE: modular_boq_price_list
-- Centralized price list for materials and labour
-- used across modular BOQ lines.
-- ============================================================
CREATE TABLE IF NOT EXISTS modular_boq_price_list (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255)   NOT NULL,
    unit          VARCHAR(100)   NOT NULL DEFAULT 'unité',
    unit_price    DECIMAL(12,2)  NOT NULL DEFAULT 0,
    has_vat       BOOLEAN        DEFAULT TRUE,
    supplier_id   INT            NULL,
    display_order INT            DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name          (name),
    INDEX idx_supplier_id   (supplier_id),
    INDEX idx_display_order (display_order),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Default price list for modular homes (Mauritius Rupees)
-- ============================================================
INSERT IGNORE INTO modular_boq_price_list (name, unit, unit_price, has_vat, display_order) VALUES
-- Labour (NO VAT)
('Main d''oeuvre Qualifiée (1 jour)',        'jour',       3000.00, FALSE,  1),
('Main d''oeuvre Non Qualifiée (1 jour)',    'jour',       2000.00, FALSE,  2),
('Transport Matériaux',                      'unité',      4500.00, FALSE,  3),
('Location Grue (1 jour)',                   'jour',      20000.00, FALSE,  4),
-- Structure (VAT)
('Poutre IPE 200 (6m)',                      'unité',      8500.00, TRUE,   5),
('Poutre HEA 160 (6m)',                      'unité',      7500.00, TRUE,   6),
('Plaque de base 200x200x10mm',              'unité',       850.00, TRUE,   7),
('Boulon M20 (lot de 10)',                   'lot',         450.00, TRUE,   8),
-- Foundations (VAT)
('Béton Toupie (fondations)',                'm³',         5500.00, TRUE,   9),
('Fer Y16 (barre de 9m)',                    'barre',      1200.00, TRUE,  10),
('Fer Y12 (barre de 9m)',                    'barre',       850.00, TRUE,  11),
('Crusherrun',                               'tonne',      1200.00, TRUE,  12),
('Ciment (sac de 25kg)',                     'sac',         280.00, TRUE,  13),
('Sable (tonne)',                            'tonne',      1000.00, TRUE,  14),
-- Walls (VAT)
('Panneau Sandwich 75mm (m²)',               'm²',         1800.00, TRUE,  15),
('Bloc BAB',                                 'unité',        35.00, TRUE,  16),
('Brique Creuse',                            'unité',        25.00, TRUE,  17),
('Mortier (sac de 25kg)',                    'sac',         220.00, TRUE,  18),
-- Roofing (VAT)
('Tôle Ondulée Galvanisée (m²)',             'm²',          650.00, TRUE,  19),
('Bac Acier (m²)',                           'm²',          950.00, TRUE,  20),
('Membrane Étanchéité (m²)',                 'm²',          350.00, TRUE,  21),
('Laine de Verre Isolation (m²)',            'm²',          280.00, TRUE,  22),
-- Flooring (VAT)
('Carrelage Sol (m²)',                       'm²',          800.00, TRUE,  23),
('Parquet Stratifié (m²)',                   'm²',          950.00, TRUE,  24),
('Chape de Sol Béton (m²)',                  'm²',          350.00, TRUE,  25),
('Isolant Sous-Sol (m²)',                    'm²',          150.00, TRUE,  26),
-- Doors & Windows (VAT)
('Porte Extérieure PVC 90x210cm',            'unité',      8500.00, TRUE,  27),
('Porte Intérieure 80x200cm',                'unité',      3500.00, TRUE,  28),
('Fenêtre PVC Double Vitrage 100x120cm',     'unité',      7500.00, TRUE,  29),
('Fenêtre PVC Simple Vitrage 80x100cm',      'unité',      4500.00, TRUE,  30),
-- Plumbing (VAT except labour)
('Tuyaux PVC 50mm (mètre)',                  'mètre',        85.00, TRUE,  31),
('Tuyaux PVC 110mm (mètre)',                 'mètre',       150.00, TRUE,  32),
('Robinetterie Cuisine (forfait)',            'forfait',    4500.00, TRUE,  33),
('Robinetterie Salle de Bain (forfait)',      'forfait',    3500.00, TRUE,  34),
('Plombier (1 jour)',                         'jour',       3000.00, FALSE, 35),
-- Electrical (VAT except labour)
('Câbles 2.5mm² (mètre)',                    'mètre',        45.00, TRUE,  36),
('Tableau Électrique (forfait)',              'forfait',    8000.00, TRUE,  37),
('Prise/Interrupteur (unité)',               'unité',       450.00, TRUE,  38),
('Luminaire LED (unité)',                    'unité',      1200.00, TRUE,  39),
('Electricien (1 jour)',                     'jour',       3000.00, FALSE, 40),
-- Finishes (VAT)
('Peinture Intérieure (L)',                  'litre',       350.00, TRUE,  41),
('Peinture Extérieure (L)',                  'litre',       450.00, TRUE,  42),
('Enduit de Façade (sac de 25kg)',           'sac',         350.00, TRUE,  43),
('Colle Carrelage (sac de 25kg)',            'sac',         450.00, TRUE,  44),
('Joint Carrelage (kg)',                     'kg',          250.00, TRUE,  45);

-- ============================================================
-- TABLE: modular_boq_templates
-- Reusable BOQ template configurations that can be
-- cloned to new modular home models.
-- ============================================================
CREATE TABLE IF NOT EXISTS modular_boq_templates (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT         NULL,
    is_default    BOOLEAN      DEFAULT FALSE,
    template_data LONGTEXT     NULL COMMENT 'JSON template structure',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ALTER: modular dimensions columns on models table
-- ============================================================
DROP PROCEDURE IF EXISTS _add_col_models_modular_dims;
DELIMITER //
CREATE PROCEDURE _add_col_models_modular_dims()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'models'
          AND COLUMN_NAME  = 'modular_longueur'
    ) THEN
        ALTER TABLE models
            ADD COLUMN modular_longueur  DECIMAL(8,2) NULL AFTER has_overflow,
            ADD COLUMN modular_largeur   DECIMAL(8,2) NULL AFTER modular_longueur,
            ADD COLUMN modular_nb_etages INT          NULL DEFAULT 1 AFTER modular_largeur;
    END IF;
END //
DELIMITER ;
CALL _add_col_models_modular_dims();
DROP PROCEDURE IF EXISTS _add_col_models_modular_dims;

-- ============================================================
-- END OF MODULAR BOQ MIGRATION
-- ============================================================
SELECT 'Modular BOQ Migration completed successfully!' AS Status;
