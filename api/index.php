<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
handleCORS();

// Pro site deployment versions — increment these when templates or DB schema change.
// PRO_FILE_VERSION must match define('PRO_FILE_VERSION', ...) in api/pro_deploy/api_config.php
define('PRO_FILE_VERSION',      '2.9.8');
define('PRO_DB_SCHEMA_VERSION', '1.8.0');

// Semi-pro shared site deployment version.
// SEMI_PRO_FILE_VERSION must match define('SEMI_PRO_FILE_VERSION', ...) in api/semi_pro_deploy/api_config.php
define('SEMI_PRO_FILE_VERSION',      '1.0.0');
define('SEMI_PRO_DB_SCHEMA_VERSION', '1.0.0');

// Sunbox main database schema version.
// Increment when new tables or columns are added.
define('SUNBOX_DB_SCHEMA_VERSION', '2.17.0');

$action = $_GET['action'] ?? '';
$body   = getRequestBody();

function fail(string $msg, int $code = 400): void {
    errorResponse($msg, $code);
}

function ok($data = null): void {
    successResponse($data);
}

/**
 * Get the list of valid model types: fixed types + all slugs from model_types table.
 */
function getValidModelTypes(PDO $db): array {
    $custom = [];
    try {
        $custom = $db->query("SELECT slug FROM model_types WHERE is_active = 1")->fetchAll(PDO::FETCH_COLUMN);
    } catch (\Throwable $e) {
        // model_types table may not exist yet (pre-migration)
    }
    return array_unique(array_merge(['container', 'pool'], $custom));
}
/**
 * Map model_type to a quote reference prefix.
 * Sunbox portal:  WCQ (container) | WPQ (pool) | WXQ (any custom type, X = first char of slug)
 * Pro sites:      PCQ             | PPQ         | PXQ
 */
function getQuotePrefix(string $modelType, bool $isFreeQuote = false, bool $isPro = false): string {
    if ($isFreeQuote) return 'WFQ';
    $base = $isPro ? 'P' : 'W';
    return match($modelType) {
        'container' => $base . 'CQ',
        'pool'      => $base . 'PQ',
        default     => $base . strtoupper(substr($modelType, 0, 1)) . 'Q',
    };
}

try {
    $db = getDB();

    switch ($action) {
        // === DASHBOARD STATS
        case 'get_dashboard_stats': {
            $stats = [];
            $stats['total_quotes'] = (int)$db->query("SELECT COUNT(*) FROM quotes")->fetchColumn();
            $stats['pending_quotes'] = (int)$db->query("SELECT COUNT(*) FROM quotes WHERE status='open'")->fetchColumn();
            $stats['approved_quotes'] = (int)$db->query("SELECT COUNT(*) FROM quotes WHERE status='approved'")->fetchColumn();
            $stats['today_quotes'] = (int)$db->query("SELECT COUNT(*) FROM quotes WHERE created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY")->fetchColumn();
            $stats['total_revenue'] = (float)$db->query("SELECT COALESCE(SUM(total_price),0) FROM quotes WHERE status='approved'")->fetchColumn();
            $stats['new_contacts'] = (int)$db->query("SELECT COUNT(*) FROM contacts WHERE status = 'new'")->fetchColumn();
            $stats['total_model_requests'] = (int)$db->query("SELECT COUNT(*) FROM professional_model_requests")->fetchColumn();
            $stats['pending_model_requests'] = (int)$db->query("SELECT COUNT(*) FROM professional_model_requests WHERE status='pending'")->fetchColumn();
            
            // Recent quotes (last 5)
            $recentQuotes = $db->query("
                SELECT id, reference_number, customer_name, customer_email, model_name, model_type, 
                       total_price, status, created_at 
                FROM quotes 
                ORDER BY created_at DESC 
                LIMIT 5
            ")->fetchAll();
            $stats['recent_quotes'] = $recentQuotes;
            
            // Monthly stats (last 6 months)
            $monthlyStats = $db->query("
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as count,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN total_price ELSE 0 END), 0) as revenue
                FROM quotes 
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month ASC
            ")->fetchAll();
            $stats['monthly_stats'] = $monthlyStats;
            
            ok($stats);
            break;
        }

        // === SUNBOX DB VERSIONING ─────────────────────────────────────────────
        case 'check_db_version': {
            requireAdmin();
            $currentVersion = '0.0.0';
            try {
                $row = $db->query("SELECT `version` FROM `db_schema_version` WHERE `id` = 1 LIMIT 1")->fetch();
                if ($row) $currentVersion = $row['version'];
            } catch (\Throwable $e) {
                // Table doesn't exist yet — version is 0.0.0
            }
            ok([
                'current_version' => $currentVersion,
                'latest_version'  => SUNBOX_DB_SCHEMA_VERSION,
                'is_up_to_date'   => version_compare($currentVersion, SUNBOX_DB_SCHEMA_VERSION, '>='),
            ]);
            break;
        }

        case 'update_db_schema': {
            requireAdmin();
            $messages = [];

            // Helper: safely add a column only if it doesn't exist
            $addCol = function(string $table, string $col, string $def) use ($db, &$messages): void {
                $s = $db->prepare(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
                );
                $s->execute([$table, $col]);
                if (!(bool)$s->fetchColumn()) {
                    $db->exec("ALTER TABLE `{$table}` ADD COLUMN `{$col}` {$def}");
                    $messages[] = "Colonne ajoutée : {$table}.{$col}";
                }
            };

            // Helper: create a table only if it doesn't exist
            $createTable = function(string $name, string $sql) use ($db, &$messages): void {
                $s = $db->prepare(
                    "SELECT COUNT(*) FROM information_schema.TABLES
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?"
                );
                $s->execute([$name]);
                if (!(bool)$s->fetchColumn()) {
                    $db->exec($sql);
                    $messages[] = "Table créée : {$name}";
                }
            };

            // ── v2.1.0 ── Purchase Reports (Rapport d'Achat) ──────────────────
            $createTable('purchase_reports', "
                CREATE TABLE `purchase_reports` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `quote_id` INT NOT NULL,
                    `quote_reference` VARCHAR(50) DEFAULT '',
                    `model_name` VARCHAR(255) DEFAULT '',
                    `status` ENUM('in_progress','completed') DEFAULT 'in_progress',
                    `total_amount` DECIMAL(12,2) DEFAULT 0,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");

            $createTable('purchase_report_items', "
                CREATE TABLE `purchase_report_items` (
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
                    FOREIGN KEY (`report_id`) REFERENCES `purchase_reports`(`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");

            // ── v2.2.0 ── Add is_option column to purchase_report_items ─────────
            $addCol('purchase_report_items', 'is_option', "TINYINT(1) DEFAULT 0 AFTER `is_ordered`");

            // ── v2.3.0 ── Add replace_with_sunbox flag to suppliers ──────────────
            $addCol('suppliers', 'replace_with_sunbox', "TINYINT(1) DEFAULT 0 AFTER `is_active`");

            // ── v2.4.0 ── Add pool dimension columns to quotes ───────────────────
            $addCol('quotes', 'pool_shape',         "VARCHAR(20) DEFAULT NULL AFTER `approval_token`");
            $addCol('quotes', 'pool_longueur',      "DECIMAL(8,2) DEFAULT NULL AFTER `pool_shape`");
            $addCol('quotes', 'pool_largeur',       "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur`");
            $addCol('quotes', 'pool_profondeur',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur`");
            $addCol('quotes', 'pool_longueur_la',   "DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur`");
            $addCol('quotes', 'pool_largeur_la',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_la`");
            $addCol('quotes', 'pool_profondeur_la', "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_la`");
            $addCol('quotes', 'pool_longueur_lb',   "DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur_la`");
            $addCol('quotes', 'pool_largeur_lb',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_lb`");
            $addCol('quotes', 'pool_profondeur_lb', "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_lb`");
            $addCol('quotes', 'pool_longueur_ta',   "DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur_lb`");
            $addCol('quotes', 'pool_largeur_ta',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_ta`");
            $addCol('quotes', 'pool_profondeur_ta', "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_ta`");
            $addCol('quotes', 'pool_longueur_tb',   "DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur_ta`");
            $addCol('quotes', 'pool_largeur_tb',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_tb`");
            $addCol('quotes', 'pool_profondeur_tb', "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_tb`");

            // ── v2.5.0 ── Add model_request_cost to professional_profiles ────────
            $addCol('professional_profiles', 'model_request_cost', "DECIMAL(10,2) NOT NULL DEFAULT 5000 AFTER `credits`");

            // ── v2.6.0 ── Add linked_model_id to professional_model_requests ─────
            $addCol('professional_model_requests', 'linked_model_id', "INT NULL DEFAULT NULL AFTER `bathrooms`");

            // ── v2.7.0 ── Expand quotes.status ENUM to include 'open' and 'validated' ──
            // Use ALTER TABLE MODIFY COLUMN to extend the ENUM without data loss.
            // We check first if 'open' is already in the enum to avoid unnecessary migration.
            $enumCheckStmt = $db->prepare(
                "SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'status'"
            );
            $enumCheckStmt->execute();
            $enumType = (string)($enumCheckStmt->fetchColumn() ?? '');
            if (strpos($enumType, "'open'") === false) {
                $db->exec("ALTER TABLE `quotes` MODIFY COLUMN `status`
                    ENUM('draft','open','validated','cancelled','pending','approved','rejected','completed')
                    NOT NULL DEFAULT 'open'");
                $messages[] = "Colonne modifiée : quotes.status (ENUM étendu avec 'open','validated')";
            }

            // ── v2.8.0 ── Professional themes + theme_id on professional_profiles ─
            $createTable('professional_themes', "
                CREATE TABLE `professional_themes` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `name` VARCHAR(255) NOT NULL DEFAULT 'Nouveau Thème',
                    `logo_position` ENUM('left','center','right') NOT NULL DEFAULT 'left',
                    `header_height` ENUM('small','medium','large','hero') NOT NULL DEFAULT 'medium',
                    `header_bg_color` VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
                    `header_text_color` VARCHAR(20) NOT NULL DEFAULT '#1A365D',
                    `font_family` VARCHAR(100) NOT NULL DEFAULT 'Inter',
                    `nav_position` ENUM('left','center','right') NOT NULL DEFAULT 'right',
                    `nav_has_background` TINYINT(1) NOT NULL DEFAULT 1,
                    `nav_bg_color` VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
                    `nav_text_color` VARCHAR(20) NOT NULL DEFAULT '#1A365D',
                    `nav_hover_color` VARCHAR(20) NOT NULL DEFAULT '#F97316',
                    `button_color` VARCHAR(20) NOT NULL DEFAULT '#F97316',
                    `button_text_color` VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
                    `footer_bg_color` VARCHAR(20) NOT NULL DEFAULT '#1A365D',
                    `footer_text_color` VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
                    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
            // Insert default theme (mirrors current Sunbox public layout exactly)
            $defaultExists = $db->query("SELECT COUNT(*) FROM `professional_themes` WHERE id = 1")->fetchColumn();
            if (!$defaultExists) {
                $db->exec("INSERT INTO `professional_themes` (id,name,logo_position,header_height,header_bg_color,header_text_color,font_family,nav_position,nav_has_background,nav_bg_color,nav_text_color,nav_hover_color,button_color,button_text_color,footer_bg_color,footer_text_color)
                    VALUES (1,'Thème Sunbox (Défaut)','left','medium','#FFFFFF','#1A365D','Inter','right',1,'#FFFFFF','#1A365D','#F97316','#F97316','#FFFFFF','#1A365D','#FFFFFF')");
                $messages[] = "Thème Sunbox par défaut inséré.";
            }
            $addCol('professional_profiles', 'theme_id', "INT NULL DEFAULT NULL");

            // ── v2.9.0 ── Header images per pro user (stored in main Sunbox DB) ─
            $addCol('professional_profiles', 'header_images_json', "TEXT NULL DEFAULT NULL");

            // ── v2.10.0 ── Modular Home BOQ system ───────────────────────────
            // Create modular_boq_variables table
            $createTable('modular_boq_variables', "
                CREATE TABLE `modular_boq_variables` (
                    `id`            INT AUTO_INCREMENT PRIMARY KEY,
                    `name`          VARCHAR(100) NOT NULL UNIQUE,
                    `label`         VARCHAR(255) NOT NULL,
                    `unit`          VARCHAR(50)  DEFAULT '',
                    `formula`       TEXT         NOT NULL,
                    `display_order` INT          DEFAULT 0,
                    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            // Seed default variables only if table was just created (empty)
            $modVarCount = (int)$db->query("SELECT COUNT(*) FROM modular_boq_variables")->fetchColumn();
            if ($modVarCount === 0) {
                $db->exec("INSERT IGNORE INTO modular_boq_variables (name, label, unit, formula, display_order) VALUES
                    ('surface_plancher_m2', 'Surface Plancher M2',    'm²', 'longueur * largeur',                            1),
                    ('surface_totale_m2',   'Surface Totale M2',      'm²', 'surface_plancher_m2 * nombre_etages',           2),
                    ('perimetre_m',         'Périmètre M',            'm',  '(longueur + largeur) * 2',                      3),
                    ('hauteur_etage_m',     'Hauteur Étage M',        'm',  '2.6',                                           4),
                    ('hauteur_totale_m',    'Hauteur Totale M',       'm',  'hauteur_etage_m * nombre_etages',               5),
                    ('surface_murs_m2',     'Surface Murs M2',        'm²', 'perimetre_m * hauteur_totale_m',                6),
                    ('surface_toiture_m2',  'Surface Toiture M2',     'm²', 'surface_plancher_m2 * 1.15',                   7),
                    ('volume_m3',           'Volume M3',              'm³', 'surface_plancher_m2 * hauteur_totale_m',        8),
                    ('nb_portes',           'Nb Portes (estimation)', 'unité', 'ROUND(perimetre_m / 8)',                     9),
                    ('nb_fenetres',         'Nb Fenêtres (estimation)','unité','ROUND(surface_murs_m2 / 6)',               10)
                ");
                $messages[] = "Variables BOQ Modulaire créées (10 entrées).";
            }

            // Create modular_boq_price_list table
            $createTable('modular_boq_price_list', "
                CREATE TABLE `modular_boq_price_list` (
                    `id`            INT AUTO_INCREMENT PRIMARY KEY,
                    `name`          VARCHAR(255)  NOT NULL,
                    `unit`          VARCHAR(100)  NOT NULL DEFAULT 'unité',
                    `unit_price`    DECIMAL(12,2) NOT NULL DEFAULT 0,
                    `has_vat`       BOOLEAN       DEFAULT TRUE,
                    `supplier_id`   INT           NULL,
                    `display_order` INT           DEFAULT 0,
                    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            // Seed default price list if empty
            $modPriceCount = (int)$db->query("SELECT COUNT(*) FROM modular_boq_price_list")->fetchColumn();
            if ($modPriceCount === 0) {
                $db->exec("INSERT IGNORE INTO modular_boq_price_list (name, unit, unit_price, has_vat, display_order) VALUES
                    ('Main d''oeuvre Qualifiée (1 jour)',   'jour',    3000.00, 0,  1),
                    ('Main d''oeuvre Non Qualifiée (1 jour)','jour',   2000.00, 0,  2),
                    ('Transport Matériaux',                 'unité',   4500.00, 0,  3),
                    ('Location Grue (1 jour)',              'jour',   20000.00, 0,  4),
                    ('Poutre IPE 200 (6m)',                 'unité',   8500.00, 1,  5),
                    ('Poutre HEA 160 (6m)',                 'unité',   7500.00, 1,  6),
                    ('Béton Toupie (fondations)',           'm³',      5500.00, 1,  7),
                    ('Fer Y16 (barre de 9m)',               'barre',   1200.00, 1,  8),
                    ('Fer Y12 (barre de 9m)',               'barre',    850.00, 1,  9),
                    ('Crusherrun',                          'tonne',   1200.00, 1, 10),
                    ('Ciment (sac de 25kg)',                'sac',      280.00, 1, 11),
                    ('Panneau Sandwich 75mm (m²)',          'm²',      1800.00, 1, 12),
                    ('Bloc BAB',                            'unité',     35.00, 1, 13),
                    ('Bac Acier (m²)',                      'm²',       950.00, 1, 14),
                    ('Membrane Étanchéité (m²)',            'm²',       350.00, 1, 15),
                    ('Carrelage Sol (m²)',                  'm²',       800.00, 1, 16),
                    ('Porte Extérieure PVC 90x210cm',       'unité',   8500.00, 1, 17),
                    ('Fenêtre PVC Double Vitrage 100x120cm','unité',   7500.00, 1, 18),
                    ('Tableau Électrique (forfait)',         'forfait', 8000.00, 1, 19),
                    ('Câbles 2.5mm² (mètre)',               'mètre',     45.00, 1, 20),
                    ('Electricien (1 jour)',                'jour',    3000.00, 0, 21),
                    ('Plombier (1 jour)',                   'jour',    3000.00, 0, 22),
                    ('Peinture Intérieure (L)',             'litre',    350.00, 1, 23),
                    ('Peinture Extérieure (L)',             'litre',    450.00, 1, 24)
                ");
                $messages[] = "Base de prix BOQ Modulaire créée (24 entrées).";
            }

            // Create modular_boq_templates table
            $createTable('modular_boq_templates', "
                CREATE TABLE `modular_boq_templates` (
                    `id`            INT AUTO_INCREMENT PRIMARY KEY,
                    `name`          VARCHAR(255) NOT NULL,
                    `description`   TEXT         NULL,
                    `is_default`    BOOLEAN      DEFAULT FALSE,
                    `template_data` LONGTEXT     NULL,
                    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");

            // Update models.type ENUM to include 'modular' (idempotent)
            $modelsTypeCheck = $db->prepare(
                "SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'models' AND COLUMN_NAME = 'type'"
            );
            $modelsTypeCheck->execute();
            $modelsTypeEnum = (string)($modelsTypeCheck->fetchColumn() ?? '');
            if (strpos($modelsTypeEnum, "'modular'") === false) {
                $db->exec("ALTER TABLE `models` MODIFY COLUMN `type` ENUM('container','pool','modular') NOT NULL");
                $messages[] = "Colonne modifiée : models.type (ENUM étendu avec 'modular')";
            }

            // Add modular dimension columns to models table
            $addCol('models', 'modular_longueur',  "DECIMAL(8,2) NULL DEFAULT NULL");
            $addCol('models', 'modular_largeur',   "DECIMAL(8,2) NULL DEFAULT NULL");
            $addCol('models', 'modular_nb_etages', "INT          NULL DEFAULT 1");

            // Add modular dimension columns to quotes table
            $addCol('quotes', 'modular_longueur',  "DECIMAL(8,2) DEFAULT NULL");
            $addCol('quotes', 'modular_largeur',   "DECIMAL(8,2) DEFAULT NULL");
            $addCol('quotes', 'modular_nb_etages', "INT          DEFAULT NULL");

            // ── v2.11.0 ── Dynamic model types (admin-managed) ───────────────
            // Create model_types table so admins can create arbitrary solution types
            $createTable('model_types', "
                CREATE TABLE `model_types` (
                    `id`            INT AUTO_INCREMENT PRIMARY KEY,
                    `slug`          VARCHAR(50)  NOT NULL UNIQUE,
                    `name`          VARCHAR(255) NOT NULL,
                    `description`   TEXT         NULL,
                    `icon_name`     VARCHAR(100) DEFAULT 'Box',
                    `display_order` INT          DEFAULT 0,
                    `is_active`     TINYINT(1)   DEFAULT 1,
                    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");

            // Migrate models.type from ENUM to VARCHAR(50) so any slug can be stored
            $modelsTypeCheck2 = $db->prepare(
                "SELECT DATA_TYPE FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'models' AND COLUMN_NAME = 'type'"
            );
            $modelsTypeCheck2->execute();
            $modelsDataType = (string)($modelsTypeCheck2->fetchColumn() ?? '');
            if (strtolower($modelsDataType) === 'enum') {
                $db->exec("ALTER TABLE `models` MODIFY COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'container'");
                $messages[] = "Colonne modifiée : models.type (ENUM → VARCHAR(50) pour types dynamiques)";
            }

            // ── v2.12.0 ── Per-type configurable dimensions ──────────────────────────
            $createTable('model_type_dimensions', "
                CREATE TABLE `model_type_dimensions` (
                    `id`              INT AUTO_INCREMENT PRIMARY KEY,
                    `model_type_slug`  VARCHAR(50)   NOT NULL,
                    `slug`            VARCHAR(50)   NOT NULL,
                    `label`           VARCHAR(100)  NOT NULL,
                    `unit`            VARCHAR(20)   DEFAULT 'm',
                    `min_value`       DECIMAL(10,4) DEFAULT 0,
                    `max_value`       DECIMAL(10,4) DEFAULT 1000,
                    `step`            DECIMAL(10,4) DEFAULT 0.5,
                    `default_value`   DECIMAL(10,4) DEFAULT 1,
                    `display_order`   INT           DEFAULT 0,
                    UNIQUE KEY `uq_model_type_dim` (`model_type_slug`, `slug`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");

            // Seed default 3 dimensions for legacy 'modular' type (backward compat)
            try {
                $dimCount = (int)$db->query("SELECT COUNT(*) FROM `model_type_dimensions` WHERE `model_type_slug` = 'modular'")->fetchColumn();
                if ($dimCount === 0) {
                    $db->exec("INSERT INTO `model_type_dimensions`
                        (`model_type_slug`,`slug`,`label`,`unit`,`min_value`,`max_value`,`step`,`default_value`,`display_order`)
                        VALUES
                        ('modular','longueur','Longueur','m',3,50,0.5,10,1),
                        ('modular','largeur','Largeur','m',3,30,0.5,8,2),
                        ('modular','nombre_etages','Nombre d''étages','',1,5,1,1,3)");
                    $messages[] = "Dimensions par défaut ajoutées pour le type 'modular'";
                }
            } catch (\Throwable $e) { /* ignore – table may already be populated */ }

            // Add custom_dimensions JSON column to quotes (always exists on Sunbox DB)
            $addCol('quotes', 'custom_dimensions', "JSON NULL DEFAULT NULL");

            // pro_quotes only exists on deployed pro-user sites, not on the main Sunbox DB.
            // Guard with a table existence check to avoid SQLSTATE[42S02] on fresh installs.
            $chkProQuotes = $db->prepare(
                "SELECT COUNT(*) FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes'"
            );
            $chkProQuotes->execute();
            if ((bool)$chkProQuotes->fetchColumn()) {
                $addCol('pro_quotes', 'custom_dimensions', "JSON NULL DEFAULT NULL");
            }

            // ── v2.13.0 ── Per-type BOQ variables and templates ──────────────────
            // Add model_type_slug to modular_boq_variables
            $addCol('modular_boq_variables', 'model_type_slug', "VARCHAR(50) DEFAULT NULL AFTER `id`");
            // Replace the global unique-on-name constraint with a per-(type,name) composite one
            $dropUniqueStmt = $db->prepare(
                "SELECT COUNT(*) FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modular_boq_variables'
                 AND INDEX_NAME = 'name' AND NON_UNIQUE = 0"
            );
            $dropUniqueStmt->execute();
            if ((bool)$dropUniqueStmt->fetchColumn()) {
                try { $db->exec("ALTER TABLE `modular_boq_variables` DROP INDEX `name`"); } catch (\Throwable $e) {}
                $messages[] = "Index supprimé : modular_boq_variables.name (unique global → unique par type)";
            }
            $addCompUniqueStmt = $db->prepare(
                "SELECT COUNT(*) FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modular_boq_variables'
                 AND INDEX_NAME = 'uq_type_var_name'"
            );
            $addCompUniqueStmt->execute();
            if (!(bool)$addCompUniqueStmt->fetchColumn()) {
                try { $db->exec("ALTER TABLE `modular_boq_variables` ADD UNIQUE KEY `uq_type_var_name` (`model_type_slug`, `name`)"); } catch (\Throwable $e) {}
                $messages[] = "Index ajouté : modular_boq_variables.uq_type_var_name (model_type_slug, name)";
            }
            // Add model_type_slug to modular_boq_templates
            $addCol('modular_boq_templates', 'model_type_slug', "VARCHAR(50) DEFAULT NULL AFTER `id`");

            // ── v2.14.0 ── Gallery photos with region & pro-user ownership ───
            // Expand media_type ENUM to include 'gallerie'
            try {
                $chkEnum = $db->prepare(
                    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'model_images' AND COLUMN_NAME = 'media_type'"
                );
                $chkEnum->execute();
                $enumType = (string)$chkEnum->fetchColumn();
                if (strpos($enumType, "'gallerie'") === false) {
                    $db->exec("ALTER TABLE `model_images` MODIFY COLUMN `media_type`
                        ENUM('photo','plan','bandeau','category_image','gallerie')
                        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'photo'");
                    $messages[] = "ENUM étendu : model_images.media_type += 'gallerie'";
                }
            } catch (\Throwable $e) { $messages[] = "ENUM gallerie : " . $e->getMessage(); }

            // Gallery metadata columns
            $addCol('model_images', 'region',       "VARCHAR(20)  NULL DEFAULT NULL");
            $addCol('model_images', 'title',        "VARCHAR(255) NULL DEFAULT NULL");
            $addCol('model_images', 'description',  "TEXT          NULL DEFAULT NULL");
            $addCol('model_images', 'pro_user_id',  "INT           NULL DEFAULT NULL");

            // ── v2.16.0 ── Add 'semi_professional' role for semi-pro users ──────
            try {
                $chkRoleEnum = $db->prepare(
                    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"
                );
                $chkRoleEnum->execute();
                $roleEnumType = (string)$chkRoleEnum->fetchColumn();
                if (strpos($roleEnumType, "'semi_professional'") === false) {
                    $db->exec("ALTER TABLE `users` MODIFY COLUMN `role`
                        ENUM('admin','manager','sales','professional','semi_professional')
                        NOT NULL DEFAULT 'sales'");
                    $messages[] = "ENUM étendu : users.role += 'semi_professional'";
                }
            } catch (\Throwable $e) { $messages[] = "ENUM semi_professional : " . $e->getMessage(); }

            // ── v2.17.0 ── Add allowed_model_type_slugs for semi-pro users ──────
            $addCol('professional_profiles', 'allowed_model_type_slugs', "JSON NULL DEFAULT NULL");

            // ── Schema version table (always create / update) ─────────────────
            $db->exec("CREATE TABLE IF NOT EXISTS `db_schema_version` (
                `id`         INT NOT NULL DEFAULT 1,
                `version`    VARCHAR(20) NOT NULL,
                `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $db->prepare(
                "INSERT INTO `db_schema_version` (`id`, `version`) VALUES (1, ?)
                 ON DUPLICATE KEY UPDATE `version` = VALUES(`version`), `applied_at` = NOW()"
            )->execute([SUNBOX_DB_SCHEMA_VERSION]);

            if (empty($messages)) $messages[] = 'Base de données déjà à jour.';
            ok(['version' => SUNBOX_DB_SCHEMA_VERSION, 'messages' => $messages]);
            break;
        }


        case 'get_settings': {
            $group = $body['group'] ?? null;
            $sql = "SELECT setting_key, setting_value FROM settings";
            $params = [];
            if ($group) {
                $sql .= " WHERE setting_group = ?";
                $params[] = $group;
            }
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $result = [];
            foreach ($stmt->fetchAll() as $row) {
                $result[$row['setting_key']] = $row['setting_value'];
            }
            ok($result);
            break;
        }

        case 'update_setting': {
            validateRequired($body, ['key', 'value']);
            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value, setting_group)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  setting_value = VALUES(setting_value),
                  updated_at = NOW()
            ");
            $stmt->execute([
                $body['key'],
                $body['value'],
                $body['group'] ?? 'general'
            ]);
            ok();
            break;
        }

        case 'update_settings_bulk': {
            validateRequired($body, ['settings']);
            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value, setting_group)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  setting_value = VALUES(setting_value),
                  updated_at = NOW()
            ");
            foreach ($body['settings'] as $s) {
                $stmt->execute([
                    $s['key'],
                    $s['value'],
                    $s['group'] ?? 'general'
                ]);
            }
            ok();
            break;
        }

        // === MODELS
        case 'get_models': {
            $type       = $body['type'] ?? null;
            $activeOnly = $body['active_only'] ?? true;
            $includeBOQPrice = $body['include_boq_price'] ?? true;
            
            $sql = "SELECT * FROM models WHERE 1=1";
            $params = [];
            if ($type) {
                $sql .= " AND type = ?";
                $params[] = $type;
            }
            if ($activeOnly) {
                $sql .= " AND is_active = 1";
            }
            $sql .= " ORDER BY display_order ASC, name ASC";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $models = $stmt->fetchAll();

            foreach ($models as &$m) {
                $m['features'] = $m['features'] ? json_decode($m['features'], true) : [];
                // Fetch plan_url from model_images table
                $planStmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'plan' ORDER BY is_primary DESC, id DESC LIMIT 1");
                $planStmt->execute([$m['id']]);
                $m['plan_url'] = ($row = $planStmt->fetch()) ? '/' . ltrim($row['file_path'], '/') : null;
                // Fetch photo image_url from model_images table (media_type = 'photo')
                // Falls back to the image_url column in models table if no photo found in model_images
                $photoStmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'photo' ORDER BY is_primary DESC, id DESC LIMIT 1");
                $photoStmt->execute([$m['id']]);
                $photoRow = $photoStmt->fetch();
                if ($photoRow && $photoRow['file_path']) {
                    $m['image_url'] = '/' . ltrim($photoRow['file_path'], '/');
                } elseif (!empty($m['image_url'])) {
                    // Use existing image_url from models table, ensure it has leading slash
                    $m['image_url'] = '/' . ltrim($m['image_url'], '/');
                }
                $m['has_overflow'] = (bool)$m['has_overflow'];
                $m['unforeseen_cost_percent'] = (float)($m['unforeseen_cost_percent'] ?? 10);
                
                // Calculate BOQ price if requested
                if ($includeBOQPrice) {
                    $boqStmt = $db->prepare("
                        SELECT 
                            COALESCE(SUM(ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS boq_base_price_ht,
                            COALESCE(SUM(ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht), 2)), 0) AS boq_cost_ht
                        FROM boq_categories bc
                        LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                        LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                        WHERE bc.model_id = ? AND bc.is_option = FALSE
                    ");
                    $boqStmt->execute([$m['id']]);
                    $boqResult = $boqStmt->fetch();
                    
                    $boqPrice = (float)($boqResult['boq_base_price_ht'] ?? 0);
                    $m['boq_base_price_ht'] = $boqPrice;
                    $m['boq_cost_ht'] = (float)($boqResult['boq_cost_ht'] ?? 0);
                    
                    // Apply unforeseen cost percentage to BOQ price
                    $unforeseen = (float)$m['unforeseen_cost_percent'];
                    
                    // Use BOQ price if available, otherwise use manual base_price
                    if ($boqPrice > 0) {
                        $m['calculated_base_price'] = round($boqPrice * (1 + $unforeseen / 100), 2);
                        $m['price_source'] = 'boq';
                    } else {
                        $m['calculated_base_price'] = (float)$m['base_price'];
                        $m['price_source'] = 'manual';
                    }
                }

                // Embed active discounts for this model (global or model-specific)
                $todayDisc = date('Y-m-d');
                $discStmt = $db->prepare("
                    SELECT d.id, d.name, d.discount_type, d.discount_value, d.apply_to, d.end_date
                    FROM discounts d
                    WHERE d.is_active = 1
                      AND d.start_date <= ? AND d.end_date >= ?
                      AND (
                          NOT EXISTS (SELECT 1 FROM discount_models dm WHERE dm.discount_id = d.id)
                          OR EXISTS (SELECT 1 FROM discount_models dm WHERE dm.discount_id = d.id AND dm.model_id = ?)
                      )
                    ORDER BY d.discount_value DESC
                ");
                $discStmt->execute([$todayDisc, $todayDisc, (int)$m['id']]);
                $activeDiscs = $discStmt->fetchAll();
                foreach ($activeDiscs as &$disc) {
                    $disc['discount_value'] = (float)$disc['discount_value'];
                    $disc['id'] = (int)$disc['id'];
                }
                unset($disc);
                $m['active_discounts'] = $activeDiscs;
            }

            ok($models);
            break;
        }

        case 'create_model': {
            validateRequired($body, ['name', 'type', 'base_price']);
            if (!in_array($body['type'], getValidModelTypes($db))) {
                fail('Type de modèle invalide');
            }
            $stmt = $db->prepare("
                INSERT INTO models (
                    name, type, description, base_price, unforeseen_cost_percent,
                    surface_m2, bedrooms, bathrooms,
                    container_20ft_count, container_40ft_count,
                    pool_shape, has_overflow,
                    image_url, plan_image_url,
                    features, is_active, display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                $body['type'],
                sanitize($body['description'] ?? ''),
                (float)$body['base_price'],
                (float)($body['unforeseen_cost_percent'] ?? 10),
                (float)($body['surface_m2'] ?? 0),
                (int)($body['bedrooms'] ?? 0),
                (int)($body['bathrooms'] ?? 0),
                (int)($body['container_20ft_count'] ?? 0),
                (int)($body['container_40ft_count'] ?? 0),
                sanitize($body['pool_shape'] ?? ''),
                isset($body['has_overflow']) ? (int)$body['has_overflow'] : 0,
                sanitize($body['image_url'] ?? ''),
                sanitize($body['plan_image_url'] ?? ''),
                json_encode($body['features'] ?? []),
                (bool)($body['is_active'] ?? true),
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_model': {
            validateRequired($body, ['id']);
            if (isset($body['type']) && !in_array($body['type'], getValidModelTypes($db))) {
                fail('Type de modèle invalide');
            }
            $allowed = [
                'name','type','description','base_price','unforeseen_cost_percent','surface_m2',
                'bedrooms','bathrooms','container_20ft_count','container_40ft_count',
                'pool_shape','has_overflow','image_url','plan_image_url',
                'features','is_active','display_order'
            ];
            $fields = [];
            $params = [];
            foreach ($allowed as $f) {
                if (array_key_exists($f, $body)) {
                    $fields[] = "$f = ?";
                    if ($f === 'features') {
                        $params[] = json_encode($body[$f]);
                    } elseif (in_array($f, ['base_price','surface_m2','unforeseen_cost_percent'])) {
                        $params[] = (float)$body[$f];
                    } elseif (in_array($f, ['bedrooms','bathrooms','container_20ft_count','container_40ft_count','display_order'])) {
                        $params[] = (int)$body[$f];
                    } elseif ($f === 'has_overflow') {
                        $params[] = (int)$body[$f];
                    } elseif ($f === 'is_active') {
                        $params[] = (bool)$body[$f];
                    } else {
                        $params[] = sanitize($body[$f]);
                    }
                }
            }
            if (!$fields) fail('Nothing to update');
            $params[] = (int)$body['id'];
            $sql = "UPDATE models SET ".implode(', ', $fields).", updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            ok();
            break;
        }

        case 'delete_model': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM models WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        // === OPTIONS (Nouveau)
        case 'get_model_options': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");

            $stmt = $db->prepare("
                SELECT mo.*, oc.name as category_name, oc.description as category_description,
                       oc.image_id as category_image_id, mi.file_path as category_image_path
                FROM model_options mo
                LEFT JOIN option_categories oc ON mo.category_id = oc.id
                LEFT JOIN model_images mi ON oc.image_id = mi.id
                WHERE mo.model_id = ?
                ORDER BY oc.display_order ASC, mo.display_order ASC
            ");
            $stmt->execute([$modelId]);
            $options = $stmt->fetchAll();
            foreach ($options as &$opt) {
                $opt['category_image_url'] = $opt['category_image_path'] ? '/' . ltrim($opt['category_image_path'], '/') : null;
                unset($opt['category_image_path']);
            }
            ok($options);
            break;
        }

        case 'create_model_option': {
            validateRequired($body, ['model_id', 'name']);
            $stmt = $db->prepare("
                INSERT INTO model_options
                (model_id, category_id, name, description, price, is_active, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                (int)$body['model_id'],
                $body['category_id'] ?? null,
                sanitize($body['name']),
                sanitize($body['description'] ?? ''),
                (float)($body['price'] ?? 0),
                (bool)($body['is_active'] ?? true),
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_model_option': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE model_options SET
                    category_id = ?, name = ?, description = ?, price = ?,
                    is_active = ?, display_order = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $body['category_id'] ?? null,
                sanitize($body['name']),
                sanitize($body['description'] ?? ''),
                (float)($body['price'] ?? 0),
                (bool)($body['is_active'] ?? true),
                (int)($body['display_order'] ?? 0),
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        case 'delete_model_option': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM model_options WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'copy_model_options': {
            validateRequired($body, ['from_model_id', 'to_model_id']);
            $fromId = (int)$body['from_model_id'];
            $toId = (int)$body['to_model_id'];

            $stmt = $db->prepare("SELECT * FROM model_options WHERE model_id = ?");
            $stmt->execute([$fromId]);
            $options = $stmt->fetchAll();

            $insert = $db->prepare("
                INSERT INTO model_options
                (model_id, category_id, name, description, price, is_active, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($options as $opt) {
                $insert->execute([
                    $toId,
                    $opt['category_id'],
                    $opt['name'],
                    $opt['description'],
                    $opt['price'],
                    $opt['is_active'],
                    $opt['display_order'],
                ]);
            }

            ok(['copied' => count($options)]);
            break;
        }

        // === BANDEAU
        case 'get_banner_images': {
            $stmt = $db->prepare("SELECT id, file_path FROM model_images WHERE media_type = 'bandeau' ORDER BY id DESC");
            $stmt->execute();
            $rows = $stmt->fetchAll();
            $data = array_map(function ($r) {
                return [
                    'id' => (int)$r['id'],
                    'url' => '/' . ltrim((string)$r['file_path'], '/'),
                ];
            }, $rows);
            ok($data);
            break;
        }

        // === CATEGORY IMAGES
        case 'get_category_images': {
            $stmt = $db->prepare("SELECT id, file_path FROM model_images WHERE media_type = 'category_image' ORDER BY id DESC");
            $stmt->execute();
            $rows = $stmt->fetchAll();
            $data = array_map(function ($r) {
                return [
                    'id' => (int)$r['id'],
                    'url' => '/' . ltrim((string)$r['file_path'], '/'),
                ];
            }, $rows);
            ok($data);
            break;
        }

        // === GALLERY IMAGES (public)
        case 'get_gallery_images': {
            $region    = $body['region']      ?? null;
            $proUserId = $body['pro_user_id'] ?? null;

            $sql    = "SELECT id, file_path, region, title, description, pro_user_id, created_at
                       FROM model_images WHERE media_type = 'gallerie'";
            $params = [];

            if ($region && in_array($region, ['Nord','Sud','Est','Ouest','Centre'], true)) {
                $sql .= " AND region = ?";
                $params[] = $region;
            }
            if ($proUserId !== null) {
                $sql .= " AND pro_user_id = ?";
                $params[] = (int)$proUserId;
            } else {
                $sql .= " AND (pro_user_id IS NULL OR pro_user_id = 0)";
            }

            $sql .= " ORDER BY id DESC";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            $data = array_map(function ($r) {
                return [
                    'id'          => (int)$r['id'],
                    'url'         => '/' . ltrim((string)$r['file_path'], '/'),
                    'region'      => $r['region'],
                    'title'       => $r['title'],
                    'description' => $r['description'],
                    'pro_user_id' => $r['pro_user_id'] ? (int)$r['pro_user_id'] : null,
                    'created_at'  => $r['created_at'],
                ];
            }, $rows);
            ok($data);
            break;
        }

        // === SUPPLIERS (Fournisseurs)
        case 'get_suppliers': {
            $activeOnly = $body['active_only'] ?? true;
            $sql = "SELECT * FROM suppliers";
            if ($activeOnly) {
                $sql .= " WHERE is_active = 1";
            }
            $sql .= " ORDER BY name ASC";
            $rows = $db->query($sql)->fetchAll();
            // PDO returns TINYINT(1) as string "0"/"1"; cast to int so JS treats 0 as falsy.
            foreach ($rows as &$row) {
                $row['is_active']          = (int)($row['is_active'] ?? 0);
                $row['replace_with_sunbox'] = (int)($row['replace_with_sunbox'] ?? 0);
            }
            unset($row);
            ok($rows);
            break;
        }

        case 'create_supplier': {
            validateRequired($body, ['name']);
            $stmt = $db->prepare("
                INSERT INTO suppliers (name, city, phone, email, is_active, replace_with_sunbox)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['city'] ?? ''),
                sanitize($body['phone'] ?? ''),
                sanitize($body['email'] ?? ''),
                (bool)($body['is_active'] ?? true),
                (int)($body['replace_with_sunbox'] ?? 0),
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_supplier': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE suppliers SET
                    name = ?, city = ?, phone = ?, email = ?, is_active = ?,
                    replace_with_sunbox = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['city'] ?? ''),
                sanitize($body['phone'] ?? ''),
                sanitize($body['email'] ?? ''),
                (bool)($body['is_active'] ?? true),
                (int)($body['replace_with_sunbox'] ?? 0),
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        case 'delete_supplier': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM suppliers WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        // === BOQ CATEGORIES
        case 'get_boq_categories': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");
            
            $stmt = $db->prepare("
                SELECT bc.*, 
                    mi.file_path AS image_path,
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht), 2)), 0) AS total_cost_ht,
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS total_sale_price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                LEFT JOIN model_images mi ON bc.image_id = mi.id
                WHERE bc.model_id = ?
                GROUP BY bc.id
                ORDER BY bc.display_order ASC, bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $categories = $stmt->fetchAll();
            
            foreach ($categories as &$cat) {
                $cat['id'] = (int)$cat['id'];
                $cat['is_option'] = (bool)$cat['is_option'];
                $cat['qty_editable'] = (bool)($cat['qty_editable'] ?? false);
                $cat['parent_id'] = $cat['parent_id'] ? (int)$cat['parent_id'] : null;
                $cat['total_cost_ht'] = round((float)$cat['total_cost_ht'], 2);
                $cat['total_sale_price_ht'] = round((float)$cat['total_sale_price_ht'], 2);
                $cat['total_profit_ht'] = round((float)$cat['total_sale_price_ht'] - (float)$cat['total_cost_ht'], 2);
                $cat['image_url'] = $cat['image_path'] ? '/' . ltrim($cat['image_path'], '/') : null;
                unset($cat['image_path']);
            }
            
            ok($categories);
            break;
        }

        case 'create_boq_category': {
            validateRequired($body, ['model_id', 'name']);
            $stmt = $db->prepare("
                INSERT INTO boq_categories (model_id, parent_id, name, is_option, qty_editable, display_order, image_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                (int)$body['model_id'],
                !empty($body['parent_id']) ? (int)$body['parent_id'] : null,
                sanitize($body['name']),
                (bool)($body['is_option'] ?? false),
                (bool)($body['qty_editable'] ?? false),
                (int)($body['display_order'] ?? 0),
                !empty($body['image_id']) ? (int)$body['image_id'] : null,
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_boq_category': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE boq_categories SET
                    name = ?, parent_id = ?, is_option = ?, qty_editable = ?, display_order = ?, image_id = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['name']),
                !empty($body['parent_id']) ? (int)$body['parent_id'] : null,
                (bool)($body['is_option'] ?? false),
                (bool)($body['qty_editable'] ?? false),
                (int)($body['display_order'] ?? 0),
                !empty($body['image_id']) ? (int)$body['image_id'] : null,
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        case 'delete_boq_category': {
            validateRequired($body, ['id']);
            // Lines are deleted via CASCADE
            $stmt = $db->prepare("DELETE FROM boq_categories WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        // === BOQ LINES
        case 'get_boq_lines': {
            $categoryId = (int)($body['category_id'] ?? 0);
            if ($categoryId <= 0) fail("category_id manquant");
            
            $stmt = $db->prepare("
                SELECT bl.*, s.name AS supplier_name,
                    ppl.name AS price_list_name,
                    ppl.unit_price AS price_list_unit_price,
                    ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht), 2) AS total_cost_ht,
                    ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2) AS sale_price_ht
                FROM boq_lines bl
                LEFT JOIN suppliers s ON bl.supplier_id = s.id
                LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                WHERE bl.category_id = ?
                ORDER BY bl.display_order ASC, bl.id ASC
            ");
            $stmt->execute([$categoryId]);
            ok($stmt->fetchAll());
            break;
        }

        case 'create_boq_line': {
            validateRequired($body, ['category_id', 'description']);
            $stmt = $db->prepare("
                INSERT INTO boq_lines (category_id, description, quantity, quantity_formula, unit, unit_cost_ht, unit_cost_formula, price_list_id, supplier_id, margin_percent, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                (int)$body['category_id'],
                sanitize($body['description']),
                (float)($body['quantity'] ?? 1),
                !empty($body['quantity_formula']) ? sanitize($body['quantity_formula']) : null,
                sanitize($body['unit'] ?? 'unité'),
                (float)($body['unit_cost_ht'] ?? 0),
                !empty($body['unit_cost_formula']) ? sanitize($body['unit_cost_formula']) : null,
                !empty($body['price_list_id']) ? (int)$body['price_list_id'] : null,
                !empty($body['supplier_id']) ? (int)$body['supplier_id'] : null,
                (float)($body['margin_percent'] ?? 30),
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_boq_line': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE boq_lines SET
                    description = ?, quantity = ?, quantity_formula = ?, unit = ?, unit_cost_ht = ?,
                    unit_cost_formula = ?, price_list_id = ?, supplier_id = ?, margin_percent = ?, display_order = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['description']),
                (float)($body['quantity'] ?? 1),
                !empty($body['quantity_formula']) ? sanitize($body['quantity_formula']) : null,
                sanitize($body['unit'] ?? 'unité'),
                (float)($body['unit_cost_ht'] ?? 0),
                !empty($body['unit_cost_formula']) ? sanitize($body['unit_cost_formula']) : null,
                !empty($body['price_list_id']) ? (int)$body['price_list_id'] : null,
                !empty($body['supplier_id']) ? (int)$body['supplier_id'] : null,
                (float)($body['margin_percent'] ?? 30),
                (int)($body['display_order'] ?? 0),
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        case 'delete_boq_line': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM boq_lines WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'update_boq_line_supplier': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE boq_lines SET supplier_id = ?, updated_at = NOW() WHERE id = ?
            ");
            $stmt->execute([
                !empty($body['supplier_id']) ? (int)$body['supplier_id'] : null,
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        // === BOQ CLONE (Clone entire BOQ from one model to another)
        case 'clone_boq': {
            validateRequired($body, ['from_model_id', 'to_model_id']);
            $fromId = (int)$body['from_model_id'];
            $toId = (int)$body['to_model_id'];
            
            // Get all categories from source model
            $stmt = $db->prepare("SELECT * FROM boq_categories WHERE model_id = ?");
            $stmt->execute([$fromId]);
            $categories = $stmt->fetchAll();
            
            $clonedCategories = 0;
            $clonedLines = 0;
            
            foreach ($categories as $cat) {
                // Create new category for target model
                $insertCat = $db->prepare("
                    INSERT INTO boq_categories (model_id, name, is_option, display_order)
                    VALUES (?, ?, ?, ?)
                ");
                $insertCat->execute([
                    $toId,
                    $cat['name'],
                    $cat['is_option'],
                    $cat['display_order'],
                ]);
                $newCatId = $db->lastInsertId();
                $clonedCategories++;
                
                // Get all lines from source category
                $stmtLines = $db->prepare("SELECT * FROM boq_lines WHERE category_id = ?");
                $stmtLines->execute([$cat['id']]);
                $lines = $stmtLines->fetchAll();
                
                foreach ($lines as $line) {
                    $insertLine = $db->prepare("
                        INSERT INTO boq_lines (category_id, description, quantity, quantity_formula, unit, unit_cost_ht, unit_cost_formula, price_list_id, supplier_id, margin_percent, display_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $insertLine->execute([
                        $newCatId,
                        $line['description'],
                        $line['quantity'],
                        $line['quantity_formula'] ?? null,
                        $line['unit'],
                        $line['unit_cost_ht'],
                        $line['unit_cost_formula'] ?? null,
                        $line['price_list_id'] ?? null,
                        $line['supplier_id'],
                        $line['margin_percent'],
                        $line['display_order'],
                    ]);
                    $clonedLines++;
                }
            }
            
            ok(['cloned_categories' => $clonedCategories, 'cloned_lines' => $clonedLines]);
            break;
        }

        // === RESET BOQ (delete all categories & lines for a model)
        case 'reset_boq': {
            validateRequired($body, ['model_id']);
            $modelId = (int)$body['model_id'];
            
            // Delete all categories for this model (lines are deleted via CASCADE)
            $stmt = $db->prepare("DELETE FROM boq_categories WHERE model_id = ?");
            $stmt->execute([$modelId]);
            $deletedCount = $stmt->rowCount();
            
            ok(['deleted_categories' => $deletedCount]);
            break;
        }

        // === GET POOL BOQ FULL (all categories + lines with formulas for public price calculation)
        case 'get_pool_boq_full': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");
            
            // Get all categories (both base and options) with parent_id
            $stmt = $db->prepare("
                SELECT bc.id, bc.name, bc.is_option, bc.qty_editable, bc.display_order, bc.parent_id
                FROM boq_categories bc
                WHERE bc.model_id = ?
                ORDER BY bc.display_order ASC, bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $categories = $stmt->fetchAll();
            
            // For each category, get its lines with full details
            $lineStmt = $db->prepare("
                SELECT bl.id, bl.description, bl.quantity, bl.quantity_formula,
                       bl.unit, bl.unit_cost_ht, bl.unit_cost_formula,
                       bl.price_list_id, bl.margin_percent, bl.display_order,
                       pl.unit_price AS price_list_unit_price
                FROM boq_lines bl
                LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
                WHERE bl.category_id = ?
                ORDER BY bl.display_order ASC, bl.id ASC
            ");
            
            foreach ($categories as &$cat) {
                $cat['id'] = (int)$cat['id'];
                $cat['is_option'] = (bool)$cat['is_option'];
                $cat['qty_editable'] = (bool)($cat['qty_editable'] ?? false);
                $cat['parent_id'] = $cat['parent_id'] ? (int)$cat['parent_id'] : null;
                $cat['display_order'] = (int)$cat['display_order'];
                $lineStmt->execute([$cat['id']]);
                $lines = $lineStmt->fetchAll();
                // Cast numeric fields for proper JSON encoding
                foreach ($lines as &$ln) {
                    $ln['id'] = (int)$ln['id'];
                    $ln['quantity'] = (float)$ln['quantity'];
                    $ln['unit_cost_ht'] = (float)$ln['unit_cost_ht'];
                    $ln['margin_percent'] = (float)$ln['margin_percent'];
                    $ln['display_order'] = (int)$ln['display_order'];
                    $ln['price_list_id'] = $ln['price_list_id'] ? (int)$ln['price_list_id'] : null;
                    $ln['price_list_unit_price'] = $ln['price_list_unit_price'] !== null ? (float)$ln['price_list_unit_price'] : null;
                }
                $cat['lines'] = $lines;
            }
            
            ok($categories);
            break;
        }

        // === GET MODEL WITH BOQ PRICE
        case 'get_model_boq_price': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");
            
            // Get model unforeseen cost percent
            $modelStmt = $db->prepare("SELECT unforeseen_cost_percent FROM models WHERE id = ?");
            $modelStmt->execute([$modelId]);
            $modelRow = $modelStmt->fetch();
            $unforeseen = (float)($modelRow['unforeseen_cost_percent'] ?? 10);
            
            // Get base price from non-option BOQ categories
            $stmt = $db->prepare("
                SELECT 
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS base_price_ht,
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht), 2)), 0) AS total_cost_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                WHERE bc.model_id = ? AND bc.is_option = FALSE
            ");
            $stmt->execute([$modelId]);
            $result = $stmt->fetch();
            
            $basePriceHT = (float)$result['base_price_ht'];
            $totalCostHT = (float)$result['total_cost_ht'];
            
            ok([
                'model_id' => $modelId,
                'base_price_ht' => $basePriceHT,
                'total_cost_ht' => $totalCostHT,
                'profit_ht' => round($basePriceHT - $totalCostHT, 2),
                'unforeseen_cost_percent' => $unforeseen,
                'base_price_ht_with_unforeseen' => round($basePriceHT * (1 + $unforeseen / 100), 2),
            ]);
            break;
        }

        // === GET BOQ OPTIONS (Categories marked as options for a model)
        case 'get_boq_options': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");

            // Step 1: Fetch ALL option categories (including sub-categories) with their own direct-line prices.
            $stmt = $db->prepare("
                SELECT bc.id, bc.name, bc.parent_id, bc.display_order, bc.qty_editable,
                       mi.file_path as image_path,
                       COALESCE(SUM(ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS own_price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                LEFT JOIN model_images mi ON bc.image_id = mi.id
                WHERE bc.model_id = ? AND bc.is_option = TRUE
                GROUP BY bc.id
                ORDER BY bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $allOptCats = $stmt->fetchAll();

            // Step 2: Build maps for PHP-side recursive aggregation.
            $priceMap = []; // id -> own_price_ht (float)
            $childMap = []; // parent_id -> [child_ids]
            foreach ($allOptCats as $cat) {
                $id            = (int)$cat['id'];
                $priceMap[$id] = (float)$cat['own_price_ht'];
                if ($cat['parent_id'] !== null) {
                    $pid = (int)$cat['parent_id'];
                    if (!isset($childMap[$pid])) $childMap[$pid] = [];
                    $childMap[$pid][] = $id;
                }
            }

            // Recursive function: returns total price for a category (own lines + all descendants).
            $getTotalPrice = function(int $id) use (&$getTotalPrice, $priceMap, $childMap): float {
                $total = $priceMap[$id] ?? 0.0;
                foreach ($childMap[$id] ?? [] as $childId) {
                    $total += $getTotalPrice($childId);
                }
                return $total;
            };

            // Step 3: Build result from root option categories only.
            $options = [];
            foreach ($allOptCats as $cat) {
                if ($cat['parent_id'] !== null) continue; // skip child categories
                $id = (int)$cat['id'];
                $options[] = [
                    'id'            => $id,
                    'name'          => $cat['name'],
                    'display_order' => (int)$cat['display_order'],
                    'qty_editable'  => (bool)($cat['qty_editable'] ?? false),
                    'image_url'     => $cat['image_path'] ? '/' . ltrim($cat['image_path'], '/') : null,
                    'price_ht'      => round($getTotalPrice($id), 2),
                ];
            }
            ok($options);
            break;
        }

        // === GET BOQ BASE CATEGORIES WITH LINES (Non-option categories included in base price)
        case 'get_boq_base_categories': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");
            
            // Get categories that are NOT options (included in base price), sorted alphabetically
            $stmt = $db->prepare("
                SELECT bc.id, bc.name, bc.display_order, bc.parent_id
                FROM boq_categories bc
                WHERE bc.model_id = ? AND bc.is_option = FALSE
                ORDER BY bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $categories = $stmt->fetchAll();
            
            // For each category, get its lines sorted alphabetically
            $lineStmt = $db->prepare("
                SELECT id, description
                FROM boq_lines
                WHERE category_id = ?
                ORDER BY description ASC
            ");
            
            foreach ($categories as &$cat) {
                $cat['id'] = (int)$cat['id'];
                $cat['parent_id'] = $cat['parent_id'] ? (int)$cat['parent_id'] : null;
                $cat['display_order'] = (int)$cat['display_order'];
                $lineStmt->execute([$cat['id']]);
                $cat['lines'] = $lineStmt->fetchAll();
            }
            
            ok($categories);
            break;
        }

        // === GET BOQ CATEGORY LINES (Get lines for a specific category)
        case 'get_boq_category_lines': {
            $categoryId = (int)($body['category_id'] ?? 0);
            if ($categoryId <= 0) fail("category_id manquant");

            // Return direct lines of this category AND lines of its sub-categories,
            // tagged with sub_category_name so the frontend can group them.
            $stmt = $db->prepare("
                SELECT bl.id, bl.description, NULL AS sub_category_name
                FROM boq_lines bl
                WHERE bl.category_id = ?
                UNION ALL
                SELECT bl.id, bl.description, bc.name AS sub_category_name
                FROM boq_lines bl
                INNER JOIN boq_categories bc ON bl.category_id = bc.id
                WHERE bc.parent_id = ?
                ORDER BY sub_category_name ASC, description ASC
            ");
            $stmt->execute([$categoryId, $categoryId]);
            ok($stmt->fetchAll());
            break;
        }

        // === QUOTES
        case 'get_quotes': {
            $stmt = $db->prepare("
                SELECT q.*, m.name as model_display_name, m.type as model_display_type, q.contact_id,
                       q.is_free_quote, q.quote_title, q.photo_url, q.plan_url, q.margin_percent
                FROM quotes q
                LEFT JOIN models m ON q.model_id = m.id
                ORDER BY q.created_at DESC
            ");
            $stmt->execute();
            ok($stmt->fetchAll());
            break;
        }

        case 'get_quotes_by_contact': {
            validateRequired($body, ['contact_id']);
            $contactId = (int)$body['contact_id'];
            
            $stmt = $db->prepare("
                SELECT q.id, q.reference_number, q.model_name, q.model_id, q.base_price, q.options_total, 
                       q.total_price, q.status, q.created_at, q.is_free_quote, q.quote_title
                FROM quotes q
                WHERE q.contact_id = ?
                ORDER BY q.created_at DESC
            ");
            $stmt->execute([$contactId]);
            ok($stmt->fetchAll());
            break;
        }

        case 'get_quote': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            
            // Get quote
            $stmt = $db->prepare("
                SELECT q.*, m.name as model_name, m.type as model_type
                FROM quotes q
                LEFT JOIN models m ON q.model_id = m.id
                WHERE q.id = ?
            ");
            $stmt->execute([$id]);
            $quote = $stmt->fetch();
            
            if (!$quote) fail('Devis non trouvé', 404);
            
            // Get quote options
            $optStmt = $db->prepare("
                SELECT option_id, option_name, option_price
                FROM quote_options
                WHERE quote_id = ?
            ");
            $optStmt->execute([$id]);
            $quote['options'] = $optStmt->fetchAll();
            
            ok($quote);
            break;
        }

        case 'create_quote': {
            validateRequired($body, ['model_id', 'model_name', 'model_type', 'base_price', 'total_price', 'customer_name', 'customer_email', 'customer_phone']);
            
            // Validate model_type
            if (!in_array($body['model_type'], getValidModelTypes($db))) {
                fail('Type de modèle invalide');
            }
            
            // Use transaction to prevent race conditions
            $db->beginTransaction();
            
            try {
                // Generate reference number: WCQ-yyyymm-xxxxxx (container) or WPQ-yyyymm-xxxxxx (pool)
                // The xxxxxx is a combined sequential counter shared between both types
                $yearMonth = date('Ym');
                $modelType = $body['model_type'];
                $prefix = getQuotePrefix($modelType);
                $maxIdStmt = $db->query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM quotes");
                $nextId = (int)$maxIdStmt->fetchColumn();
                $reference = sprintf('%s-%s-%06d', $prefix, $yearMonth, $nextId);
                
                // Calculate valid_until (30 days from now)
                $validUntil = date('Y-m-d', strtotime('+30 days'));
                
                // Create or update contact based on email
                $customerEmail = sanitize($body['customer_email']);
                $customerName = sanitize($body['customer_name']);
                $customerPhone = sanitize($body['customer_phone']);
                $customerAddress = sanitize($body['customer_address'] ?? '');
                $deviceId = isset($body['device_id']) ? sanitize($body['device_id']) : null;
                
                // Check if contact exists by email
                $contactStmt = $db->prepare("SELECT id FROM contacts WHERE email = ?");
                $contactStmt->execute([$customerEmail]);
                $existingContact = $contactStmt->fetch();
                
                if ($existingContact) {
                    // Update existing contact
                    $contactId = $existingContact['id'];
                    $updateContactStmt = $db->prepare("
                        UPDATE contacts SET 
                            name = ?, 
                            phone = ?, 
                            address = ?,
                            device_id = COALESCE(?, device_id),
                            updated_at = NOW()
                        WHERE id = ?
                    ");
                    $updateContactStmt->execute([
                        $customerName,
                        $customerPhone,
                        $customerAddress,
                        $deviceId,
                        $contactId
                    ]);
                } else {
                    // Create new contact
                    $insertContactStmt = $db->prepare("
                        INSERT INTO contacts (name, email, phone, address, device_id, status)
                        VALUES (?, ?, ?, ?, ?, 'new')
                    ");
                    $insertContactStmt->execute([
                        $customerName,
                        $customerEmail,
                        $customerPhone,
                        $customerAddress,
                        $deviceId
                    ]);
                    $contactId = $db->lastInsertId();
                }
                
                $nullFloat = fn($k) => isset($body[$k]) && $body[$k] !== null ? (float)$body[$k] : null;
                // Try to INSERT with pool dimension columns (requires pool_dimensions_migration.sql).
                // Fall back to the base INSERT if the columns don't exist yet.
                $inserted = false;
                try {
                    $stmt = $db->prepare("
                        INSERT INTO quotes (
                            reference_number, model_id, model_name, model_type,
                            base_price, options_total, total_price,
                            customer_name, customer_email, customer_phone,
                            customer_address, customer_message, contact_id,
                            status, valid_until,
                            pool_shape,
                            pool_longueur, pool_largeur, pool_profondeur,
                            pool_longueur_la, pool_largeur_la, pool_profondeur_la,
                            pool_longueur_lb, pool_largeur_lb, pool_profondeur_lb,
                            pool_longueur_ta, pool_largeur_ta, pool_profondeur_ta,
                            pool_longueur_tb, pool_largeur_tb, pool_profondeur_tb,
                            modular_longueur, modular_largeur, modular_nb_etages,
                            custom_dimensions
                                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?,
                                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                                  ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $reference,
                        (int)$body['model_id'],
                        sanitize($body['model_name']),
                        $body['model_type'],
                        (float)$body['base_price'],
                        (float)($body['options_total'] ?? 0),
                        (float)$body['total_price'],
                        $customerName,
                        $customerEmail,
                        $customerPhone,
                        $customerAddress,
                        sanitize($body['customer_message'] ?? ''),
                        $contactId,
                        $validUntil,
                        isset($body['pool_shape']) ? sanitize($body['pool_shape']) : null,
                        $nullFloat('pool_longueur'),    $nullFloat('pool_largeur'),    $nullFloat('pool_profondeur'),
                        $nullFloat('pool_longueur_la'), $nullFloat('pool_largeur_la'), $nullFloat('pool_profondeur_la'),
                        $nullFloat('pool_longueur_lb'), $nullFloat('pool_largeur_lb'), $nullFloat('pool_profondeur_lb'),
                        $nullFloat('pool_longueur_ta'), $nullFloat('pool_largeur_ta'), $nullFloat('pool_profondeur_ta'),
                        $nullFloat('pool_longueur_tb'), $nullFloat('pool_largeur_tb'), $nullFloat('pool_profondeur_tb'),
                        $nullFloat('modular_longueur'), $nullFloat('modular_largeur'),
                        isset($body['modular_nb_etages']) ? (int)$body['modular_nb_etages'] : null,
                        isset($body['custom_dimensions']) ? json_encode($body['custom_dimensions']) : null,
                    ]);
                    $inserted = true;
                } catch (PDOException $dimEx) { /* dimension columns not yet added – fall through */ }

                if (!$inserted) {
                    $stmt = $db->prepare("
                        INSERT INTO quotes (
                            reference_number, model_id, model_name, model_type,
                            base_price, options_total, total_price,
                            customer_name, customer_email, customer_phone,
                            customer_address, customer_message, contact_id,
                            status, valid_until
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
                    ");
                    $stmt->execute([
                        $reference,
                        (int)$body['model_id'],
                        sanitize($body['model_name']),
                        $body['model_type'],
                        (float)$body['base_price'],
                        (float)($body['options_total'] ?? 0),
                        (float)$body['total_price'],
                        $customerName,
                        $customerEmail,
                        $customerPhone,
                        $customerAddress,
                        sanitize($body['customer_message'] ?? ''),
                        $contactId,
                        $validUntil,
                    ]);
                }
                
                $quoteId = $db->lastInsertId();
                
                // Update reference with actual quote ID for guaranteed uniqueness
                // WCQ-yyyymm-xxxxxx (container) or WPQ-yyyymm-xxxxxx (pool)
                $reference = sprintf('%s-%s-%06d', $prefix, $yearMonth, $quoteId);
                $db->prepare("UPDATE quotes SET reference_number = ? WHERE id = ?")->execute([$reference, $quoteId]);

                // Set approval token (graceful – column may not exist until migration is run)
                try {
                    $db->prepare("UPDATE quotes SET approval_token = ? WHERE id = ?")
                       ->execute([bin2hex(random_bytes(32)), $quoteId]);
                } catch (Exception $tokenEx) { /* migration not yet applied */ }
                
                // Insert selected options
                if (!empty($body['selected_options']) && is_array($body['selected_options'])) {
                    $optStmt = $db->prepare("
                        INSERT INTO quote_options (quote_id, option_id, option_name, option_price)
                        VALUES (?, ?, ?, ?)
                    ");
                    // BOQ options have IDs offset by 1000000 and don't exist in model_options table
                    // Set option_id to NULL for these to avoid foreign key constraint violation
                    $BOQ_OPTION_ID_OFFSET = 1000000;
                    foreach ($body['selected_options'] as $opt) {
                        $optionId = (int)$opt['option_id'];
                        // If option_id >= offset, it's a BOQ option - set to NULL for FK constraint
                        $optionIdValue = ($optionId >= $BOQ_OPTION_ID_OFFSET) ? null : $optionId;
                        $optStmt->execute([
                            $quoteId,
                            $optionIdValue,
                            sanitize($opt['option_name']),
                            (float)$opt['option_price'],
                        ]);
                    }
                }
                
                $db->commit();
                ok(['id' => $quoteId, 'reference_number' => $reference, 'contact_id' => $contactId]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'update_quote_status': {
            validateRequired($body, ['id', 'status']);
            $validStatuses = ['draft', 'open', 'validated', 'cancelled', 'pending', 'approved', 'rejected', 'completed'];
            if (!in_array($body['status'], $validStatuses)) {
                fail('Statut invalide');
            }
            
            $stmt = $db->prepare("UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$body['status'], (int)$body['id']]);
            ok();
            break;
        }

        case 'delete_quote': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            
            // Delete quote lines and categories for free quotes (if any)
            $db->prepare("DELETE ql FROM quote_lines ql JOIN quote_categories qc ON ql.category_id = qc.id WHERE qc.quote_id = ?")->execute([$id]);
            $db->prepare("DELETE FROM quote_categories WHERE quote_id = ?")->execute([$id]);
            
            // Delete options first (if no CASCADE)
            $db->prepare("DELETE FROM quote_options WHERE quote_id = ?")->execute([$id]);
            
            // Delete quote
            $stmt = $db->prepare("DELETE FROM quotes WHERE id = ?");
            $stmt->execute([$id]);
            ok();
            break;
        }

        // === PURCHASE REPORTS (Rapport d'Achat) — no credit deduction for admin
        case 'create_purchase_report': {
            requireAdmin();
            validateRequired($body, ['quote_id']);
            $quoteId = (int)$body['quote_id'];

            // Idempotent: return existing report if already generated
            $chk = $db->prepare("SELECT id FROM purchase_reports WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1");
            $chk->execute([$quoteId]);
            $existing = $chk->fetch();
            if ($existing) { ok(['report_id' => (int)$existing['id'], 'already_exists' => true]); break; }

            // Get quote + model
            $qStmt = $db->prepare("
                SELECT q.*, COALESCE(m.name, q.model_name) AS resolved_model_name
                FROM quotes q LEFT JOIN models m ON q.model_id = m.id WHERE q.id = ?
            ");
            $qStmt->execute([$quoteId]);
            $quote = $qStmt->fetch();
            if (!$quote) fail('Devis introuvable', 404);

            // Fetch base BOQ lines
            $lStmt = $db->prepare("
                SELECT bc.name AS category_name,
                       bl.description, bl.quantity, bl.unit, bl.margin_percent,
                       COALESCE(ppl.unit_price, bl.unit_cost_ht) AS unit_price,
                       ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht), 2) AS total_price,
                       COALESCE(s.name, 'Fournisseur non défini') AS supplier_name,
                       bc.display_order AS cat_order, bl.display_order AS line_order
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bl.category_id = bc.id
                LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                LEFT JOIN suppliers s ON bl.supplier_id = s.id
                WHERE bc.model_id = ? AND bc.is_option = FALSE AND bl.id IS NOT NULL
                ORDER BY COALESCE(s.name,'Fournisseur non défini'), bc.display_order, bl.display_order
            ");
            $lStmt->execute([(int)$quote['model_id']]);
            $lines = $lStmt->fetchAll();

            // Fetch option BOQ lines for the options selected in this quote
            $optLinesStmt = $db->prepare("
                SELECT bc.name AS category_name,
                       bl.description, bl.quantity, bl.unit, bl.margin_percent,
                       COALESCE(ppl.unit_price, bl.unit_cost_ht) AS unit_price,
                       ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht), 2) AS total_price,
                       COALESCE(s.name, 'Fournisseur non défini') AS supplier_name,
                       bc.display_order AS cat_order, bl.display_order AS line_order
                FROM quote_options qo
                JOIN boq_categories bc ON bc.model_id = ? AND bc.is_option = TRUE AND bc.name = qo.option_name
                LEFT JOIN boq_lines bl ON bl.category_id = bc.id
                LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                LEFT JOIN suppliers s ON bl.supplier_id = s.id
                WHERE qo.quote_id = ? AND bl.id IS NOT NULL
                ORDER BY COALESCE(s.name,'Fournisseur non défini'), bc.display_order, bl.display_order
            ");
            $optLinesStmt->execute([(int)$quote['model_id'], $quoteId]);
            $optionLines = $optLinesStmt->fetchAll();

            $totalAmount = (float)array_sum(array_column($lines, 'total_price'))
                         + (float)array_sum(array_column($optionLines, 'total_price'));

            $db->beginTransaction();
            try {
                $db->prepare("INSERT INTO purchase_reports (quote_id, quote_reference, model_name, status, total_amount) VALUES (?,?,?,?,?)")
                   ->execute([$quoteId, $quote['reference_number'], $quote['resolved_model_name'] ?? '', 'in_progress', $totalAmount]);
                $reportId = (int)$db->lastInsertId();

                $iStmt = $db->prepare("INSERT INTO purchase_report_items
                    (report_id, supplier_name, category_name, description, quantity, unit, unit_price, total_price, is_option, display_order)
                    VALUES (?,?,?,?,?,?,?,?,?,?)");
                foreach ($lines as $i => $l) {
                    $iStmt->execute([
                        $reportId, $l['supplier_name'], $l['category_name'], $l['description'],
                        (float)$l['quantity'], $l['unit'], (float)$l['unit_price'], (float)$l['total_price'], 0, $i,
                    ]);
                }
                foreach ($optionLines as $i => $l) {
                    $iStmt->execute([
                        $reportId, $l['supplier_name'], $l['category_name'], $l['description'],
                        (float)$l['quantity'], $l['unit'], (float)$l['unit_price'], (float)$l['total_price'], 1, $i,
                    ]);
                }
                $db->commit();
                ok(['report_id' => $reportId]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'get_quote_purchase_report': {
            requireAdmin();
            validateRequired($body, ['quote_id']);
            $chk = $db->prepare("SELECT id FROM purchase_reports WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1");
            $chk->execute([(int)$body['quote_id']]);
            $row = $chk->fetch();
            ok($row ? ['report_id' => (int)$row['id']] : null);
            break;
        }

        case 'get_purchase_reports': {
            requireAdmin();
            $rows = $db->query("
                SELECT r.*, q.customer_name
                FROM purchase_reports r
                LEFT JOIN quotes q ON q.id = r.quote_id
                ORDER BY r.created_at DESC
            ")->fetchAll();
            foreach ($rows as &$r) { $r['total_amount'] = (float)$r['total_amount']; }
            ok($rows);
            break;
        }

        case 'get_purchase_report': {
            requireAdmin();
            validateRequired($body, ['id']);
            $rStmt = $db->prepare("
                SELECT r.*,
                       q.customer_name, q.customer_email, q.customer_phone,
                       q.base_price   AS quote_base_price_ht,
                       q.options_total AS quote_options_ht,
                       q.total_price   AS quote_total_ht
                FROM purchase_reports r
                LEFT JOIN quotes q ON q.id = r.quote_id
                WHERE r.id = ?
            ");
            $rStmt->execute([(int)$body['id']]);
            $report = $rStmt->fetch();
            if (!$report) fail('Rapport introuvable', 404);

            $vatRate = (float)env('VAT_RATE', 15);
            $report['vat_rate']             = $vatRate;
            $report['quote_base_price_ht']  = (float)($report['quote_base_price_ht'] ?? 0);
            $report['quote_options_ht']     = (float)($report['quote_options_ht'] ?? 0);
            $report['quote_total_ht']       = (float)($report['quote_total_ht'] ?? 0);
            $report['quote_base_price_ttc'] = round($report['quote_base_price_ht'] * (1 + $vatRate / 100), 2);
            $report['quote_options_ttc']    = round($report['quote_options_ht']    * (1 + $vatRate / 100), 2);
            $report['quote_total_ttc']      = round($report['quote_total_ht']      * (1 + $vatRate / 100), 2);

            $iStmt = $db->prepare("SELECT * FROM purchase_report_items WHERE report_id = ? ORDER BY is_option ASC, supplier_name, display_order");
            $iStmt->execute([(int)$body['id']]);
            $items = $iStmt->fetchAll();

            $buckets       = ['base' => [], 'option' => []];
            $totalAmountHT = 0.0;
            foreach ($items as $item) {
                $sName  = $item['supplier_name'];
                $bucket = ($item['is_option'] ?? 0) ? 'option' : 'base';
                if (!isset($buckets[$bucket][$sName])) {
                    $buckets[$bucket][$sName] = ['supplier_name' => $sName, 'items' => [], 'subtotal_ht' => 0.0, 'subtotal_ttc' => 0.0];
                }
                $item['is_ordered']        = (bool)$item['is_ordered'];
                $item['is_option']         = (bool)($item['is_option'] ?? false);
                $item['quantity']          = (float)$item['quantity'];
                $item['unit_price_ht']     = (float)$item['unit_price'];
                $item['unit_price_ttc']    = round($item['unit_price_ht'] * (1 + $vatRate / 100), 2);
                $item['total_price_ht']    = round($item['unit_price_ht'] * $item['quantity'], 2);
                $item['total_price_ttc']   = round($item['total_price_ht'] * (1 + $vatRate / 100), 2);
                // keep legacy keys for backwards compat
                $item['unit_price']        = $item['unit_price_ht'];
                $item['total_price']       = $item['total_price_ht'];
                $buckets[$bucket][$sName]['items'][]        = $item;
                $buckets[$bucket][$sName]['subtotal_ht']   += $item['total_price_ht'];
                $buckets[$bucket][$sName]['subtotal_ttc']  += $item['total_price_ttc'];
                $buckets[$bucket][$sName]['subtotal']       = $buckets[$bucket][$sName]['subtotal_ht'];
                $totalAmountHT += $item['total_price_ht'];
            }
            $report['base_groups']       = array_values($buckets['base']);
            $report['option_groups']     = array_values($buckets['option']);
            // Recalculate total_amount from items (in case it was stored with margin in old reports)
            $report['total_amount_ht']   = round($totalAmountHT, 2);
            $report['total_amount_ttc']  = round($totalAmountHT * (1 + $vatRate / 100), 2);
            $report['total_amount']      = $report['total_amount_ht'];
            ok($report);
            break;
        }

        case 'toggle_report_item': {
            requireAdmin();
            validateRequired($body, ['id']);
            $db->prepare("UPDATE purchase_report_items SET is_ordered = NOT is_ordered WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'update_report_status': {
            requireAdmin();
            validateRequired($body, ['id', 'status']);
            $db->prepare("UPDATE purchase_reports SET status = ?, updated_at = NOW() WHERE id = ?")->execute([$body['status'], (int)$body['id']]);
            ok();
            break;
        }

        case 'delete_purchase_report': {
            requireAdmin();
            validateRequired($body, ['id']);
            // Cascade deletes items via FK; no quote flag to reset on Sunbox side
            $db->prepare("DELETE FROM purchase_reports WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }


        case 'create_admin_quote': {
            // Required for both free and model-based quotes
            validateRequired($body, ['customer_name', 'customer_email', 'customer_phone']);
            
            $isFreeQuote = $body['is_free_quote'] ?? false;
            $modelType = $body['model_type'] ?? 'container'; // Default to container for free quotes
            
            // Validate model_type
            if (!in_array($modelType, getValidModelTypes($db))) {
                fail('Type de modèle invalide');
            }
            
            $db->beginTransaction();
            
            try {
                // Generate reference number
                $yearMonth = date('Ym');
                $prefix = getQuotePrefix($modelType, (bool)$isFreeQuote);
                $maxIdStmt = $db->query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM quotes");
                $nextId = (int)$maxIdStmt->fetchColumn();
                $reference = sprintf('%s-%s-%06d', $prefix, $yearMonth, $nextId);
                
                // Calculate valid_until (30 days from now)
                $validUntil = date('Y-m-d', strtotime('+30 days'));
                
                // Handle contact - either use existing or create new
                $customerEmail = sanitize($body['customer_email']);
                $customerName = sanitize($body['customer_name']);
                $customerPhone = sanitize($body['customer_phone']);
                $customerAddress = sanitize($body['customer_address'] ?? '');
                $contactId = isset($body['contact_id']) ? (int)$body['contact_id'] : null;
                
                // If no contact_id provided, check by email or create new
                if (!$contactId) {
                    $contactStmt = $db->prepare("SELECT id FROM contacts WHERE email = ?");
                    $contactStmt->execute([$customerEmail]);
                    $existingContact = $contactStmt->fetch();
                    
                    if ($existingContact) {
                        $contactId = $existingContact['id'];
                        $updateContactStmt = $db->prepare("
                            UPDATE contacts SET name = ?, phone = ?, address = ?, updated_at = NOW()
                            WHERE id = ?
                        ");
                        $updateContactStmt->execute([$customerName, $customerPhone, $customerAddress, $contactId]);
                    } else {
                        $insertContactStmt = $db->prepare("
                            INSERT INTO contacts (name, email, phone, address, status)
                            VALUES (?, ?, ?, ?, 'new')
                        ");
                        $insertContactStmt->execute([$customerName, $customerEmail, $customerPhone, $customerAddress]);
                        $contactId = $db->lastInsertId();
                    }
                }
                
                // Calculate prices
                $basePrice = (float)($body['base_price'] ?? 0);
                $optionsTotal = (float)($body['options_total'] ?? 0);
                $totalPrice = (float)($body['total_price'] ?? ($basePrice + $optionsTotal));
                
                // Insert quote
                // Try with pool dimension columns first; fall back gracefully if migration not yet applied.
                $toNullFloat = fn($k) => isset($body[$k]) && $body[$k] !== null ? (float)$body[$k] : null;
                $inserted = false;
                try {
                    $stmt = $db->prepare("
                        INSERT INTO quotes (
                            reference_number, model_id, model_name, model_type,
                            base_price, options_total, total_price,
                            customer_name, customer_email, customer_phone,
                            customer_address, customer_message, contact_id,
                            status, valid_until, is_free_quote, quote_title,
                            margin_percent, photo_url, plan_url, cloned_from_id,
                            pool_shape,
                            pool_longueur, pool_largeur, pool_profondeur
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?,
                                  ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $reference,
                        $body['model_id'] ? (int)$body['model_id'] : null,
                        sanitize($body['model_name'] ?? 'Devis libre'),
                        $modelType,
                        $basePrice,
                        $optionsTotal,
                        $totalPrice,
                        $customerName,
                        $customerEmail,
                        $customerPhone,
                        $customerAddress,
                        sanitize($body['customer_message'] ?? ''),
                        $contactId,
                        $validUntil,
                        $isFreeQuote ? 1 : 0,
                        sanitize($body['quote_title'] ?? ''),
                        (float)($body['margin_percent'] ?? 30),
                        sanitize($body['photo_url'] ?? ''),
                        sanitize($body['plan_url'] ?? ''),
                        $body['cloned_from_id'] ? (int)$body['cloned_from_id'] : null,
                        isset($body['pool_shape']) ? sanitize($body['pool_shape']) : null,
                        $toNullFloat('pool_longueur'), $toNullFloat('pool_largeur'), $toNullFloat('pool_profondeur'),
                    ]);
                    $inserted = true;
                } catch (\Throwable $insertEx) {
                    // pool_dimensions columns not yet added – fall back to base INSERT
                }
                if (!$inserted) {
                    $stmt = $db->prepare("
                        INSERT INTO quotes (
                            reference_number, model_id, model_name, model_type,
                            base_price, options_total, total_price,
                            customer_name, customer_email, customer_phone,
                            customer_address, customer_message, contact_id,
                            status, valid_until, is_free_quote, quote_title,
                            margin_percent, photo_url, plan_url, cloned_from_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $reference,
                        $body['model_id'] ? (int)$body['model_id'] : null,
                        sanitize($body['model_name'] ?? 'Devis libre'),
                        $modelType,
                        $basePrice,
                        $optionsTotal,
                        $totalPrice,
                        $customerName,
                        $customerEmail,
                        $customerPhone,
                        $customerAddress,
                        sanitize($body['customer_message'] ?? ''),
                        $contactId,
                        $validUntil,
                        $isFreeQuote ? 1 : 0,
                        sanitize($body['quote_title'] ?? ''),
                        (float)($body['margin_percent'] ?? 30),
                        sanitize($body['photo_url'] ?? ''),
                        sanitize($body['plan_url'] ?? ''),
                        $body['cloned_from_id'] ? (int)$body['cloned_from_id'] : null,
                    ]);
                }
                
                $quoteId = $db->lastInsertId();
                
                // Update reference with actual quote ID
                $reference = sprintf('%s-%s-%06d', $prefix, $yearMonth, $quoteId);
                $db->prepare("UPDATE quotes SET reference_number = ? WHERE id = ?")->execute([$reference, $quoteId]);

                // Set approval token (graceful – column may not exist until migration is run)
                try {
                    $db->prepare("UPDATE quotes SET approval_token = ? WHERE id = ?")
                       ->execute([bin2hex(random_bytes(32)), $quoteId]);
                } catch (Exception $tokenEx) { /* migration not yet applied */ }
                
                // Insert selected options for model-based quotes
                if (!$isFreeQuote && !empty($body['selected_options']) && is_array($body['selected_options'])) {
                    $optStmt = $db->prepare("
                        INSERT INTO quote_options (quote_id, option_id, option_name, option_price)
                        VALUES (?, ?, ?, ?)
                    ");
                    $BOQ_OPTION_ID_OFFSET = 1000000;
                    foreach ($body['selected_options'] as $opt) {
                        $optionId = (int)$opt['option_id'];
                        $optionIdValue = ($optionId >= $BOQ_OPTION_ID_OFFSET) ? null : $optionId;
                        $optStmt->execute([
                            $quoteId,
                            $optionIdValue,
                            sanitize($opt['option_name']),
                            (float)$opt['option_price'],
                        ]);
                    }
                }
                
                // Insert categories and lines for free quotes
                if ($isFreeQuote && !empty($body['categories']) && is_array($body['categories'])) {
                    $catStmt = $db->prepare("
                        INSERT INTO quote_categories (quote_id, name, display_order)
                        VALUES (?, ?, ?)
                    ");
                    $lineStmt = $db->prepare("
                        INSERT INTO quote_lines (category_id, description, quantity, unit, unit_cost_ht, margin_percent, display_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    foreach ($body['categories'] as $catIndex => $cat) {
                        $catStmt->execute([
                            $quoteId,
                            sanitize($cat['name']),
                            $catIndex,
                        ]);
                        $categoryId = $db->lastInsertId();
                        
                        if (!empty($cat['lines']) && is_array($cat['lines'])) {
                            foreach ($cat['lines'] as $lineIndex => $line) {
                                $lineStmt->execute([
                                    $categoryId,
                                    sanitize($line['description']),
                                    (float)($line['quantity'] ?? 1),
                                    sanitize($line['unit'] ?? 'unité'),
                                    (float)($line['unit_cost_ht'] ?? 0),
                                    (float)($line['margin_percent'] ?? 30),
                                    $lineIndex,
                                ]);
                            }
                        }
                    }
                }
                
                $db->commit();
                ok(['id' => $quoteId, 'reference_number' => $reference, 'contact_id' => $contactId]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'update_admin_quote': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            
            // Check if quote exists
            $checkStmt = $db->prepare("SELECT id, is_free_quote, status FROM quotes WHERE id = ?");
            $checkStmt->execute([$id]);
            $existingQuote = $checkStmt->fetch();
            
            if (!$existingQuote) fail('Devis non trouvé', 404);
            
            $db->beginTransaction();
            
            try {
                // Build update query dynamically.
                // Separate pool-dimension fields so they can be updated in a
                // graceful try/catch (columns may not exist until migration is run).
                $poolDimFieldNames = ['pool_shape', 'pool_longueur', 'pool_largeur', 'pool_profondeur'];
                $toNullFloat = fn($k) => isset($body[$k]) && $body[$k] !== null ? (float)$body[$k] : null;
                $updates    = [];
                $params     = [];
                $dimUpdates = [];
                $dimParams  = [];

                $allowedFields = [
                    'model_id', 'model_name', 'model_type', 'base_price', 'options_total', 
                    'total_price', 'customer_name', 'customer_email', 'customer_phone',
                    'customer_address', 'customer_message', 'status', 'quote_title',
                    'margin_percent', 'photo_url', 'plan_url', 'notes',
                    'pool_shape',
                    'pool_longueur', 'pool_largeur', 'pool_profondeur',
                ];

                foreach ($allowedFields as $field) {
                    if (array_key_exists($field, $body)) {
                        if (in_array($field, ['base_price', 'options_total', 'total_price', 'margin_percent'])) {
                            $val = $body[$field] !== null ? (float)$body[$field] : null;
                        } elseif (in_array($field, ['pool_longueur', 'pool_largeur', 'pool_profondeur'])) {
                            $val = $toNullFloat($field);
                        } elseif ($field === 'model_id') {
                            $val = $body[$field] ? (int)$body[$field] : null;
                        } else {
                            $val = $body[$field] !== null ? sanitize($body[$field]) : null;
                        }
                        if (in_array($field, $poolDimFieldNames)) {
                            $dimUpdates[] = "$field = ?";
                            $dimParams[]  = $val;
                        } else {
                            $updates[] = "$field = ?";
                            $params[]  = $val;
                        }
                    }
                }

                // Generate reference when status changes to validated
                if (isset($body['status']) && $body['status'] === 'validated' && $existingQuote['status'] !== 'validated') {
                    // Reference already exists, no need to regenerate
                }

                if (!empty($updates)) {
                    $updates[] = "updated_at = NOW()";
                    $params[] = $id;
                    $sql = "UPDATE quotes SET " . implode(', ', $updates) . " WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute($params);
                }

                // Update pool dimensions separately (graceful – columns may not exist yet)
                if (!empty($dimUpdates)) {
                    try {
                        $dimParams[] = $id;
                        $sql = "UPDATE quotes SET " . implode(', ', $dimUpdates) . " WHERE id = ?";
                        $db->prepare($sql)->execute($dimParams);
                    } catch (\Throwable $dimEx) { /* pool_dimensions_migration.sql not yet applied */ }
                }
                
                // Update categories and lines for free quotes
                if ($existingQuote['is_free_quote'] && isset($body['categories']) && is_array($body['categories'])) {
                    // Delete existing categories and lines
                    $db->prepare("DELETE ql FROM quote_lines ql JOIN quote_categories qc ON ql.category_id = qc.id WHERE qc.quote_id = ?")->execute([$id]);
                    $db->prepare("DELETE FROM quote_categories WHERE quote_id = ?")->execute([$id]);
                    
                    // Re-insert categories and lines
                    $catStmt = $db->prepare("
                        INSERT INTO quote_categories (quote_id, name, display_order)
                        VALUES (?, ?, ?)
                    ");
                    $lineStmt = $db->prepare("
                        INSERT INTO quote_lines (category_id, description, quantity, unit, unit_cost_ht, margin_percent, display_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    foreach ($body['categories'] as $catIndex => $cat) {
                        $catStmt->execute([
                            $id,
                            sanitize($cat['name']),
                            $catIndex,
                        ]);
                        $categoryId = $db->lastInsertId();
                        
                        if (!empty($cat['lines']) && is_array($cat['lines'])) {
                            foreach ($cat['lines'] as $lineIndex => $line) {
                                $lineStmt->execute([
                                    $categoryId,
                                    sanitize($line['description']),
                                    (float)($line['quantity'] ?? 1),
                                    sanitize($line['unit'] ?? 'unité'),
                                    (float)($line['unit_cost_ht'] ?? 0),
                                    (float)($line['margin_percent'] ?? 30),
                                    $lineIndex,
                                ]);
                            }
                        }
                    }
                }
                
                // Update options for model-based quotes
                if (!$existingQuote['is_free_quote'] && isset($body['selected_options']) && is_array($body['selected_options'])) {
                    // Delete existing options
                    $db->prepare("DELETE FROM quote_options WHERE quote_id = ?")->execute([$id]);
                    
                    // Re-insert options
                    $optStmt = $db->prepare("
                        INSERT INTO quote_options (quote_id, option_id, option_name, option_price)
                        VALUES (?, ?, ?, ?)
                    ");
                    $BOQ_OPTION_ID_OFFSET = 1000000;
                    foreach ($body['selected_options'] as $opt) {
                        $optionId = (int)$opt['option_id'];
                        $optionIdValue = ($optionId >= $BOQ_OPTION_ID_OFFSET) ? null : $optionId;
                        $optStmt->execute([
                            $id,
                            $optionIdValue,
                            sanitize($opt['option_name']),
                            (float)$opt['option_price'],
                        ]);
                    }
                }
                
                // Handle contact_id update - use explicit null check to allow unsetting contact
                if (array_key_exists('contact_id', $body)) {
                    $contactId = ($body['contact_id'] !== null && $body['contact_id'] !== '') ? (int)$body['contact_id'] : null;
                    $contactStmt = $db->prepare("UPDATE quotes SET contact_id = ? WHERE id = ?");
                    $contactStmt->execute([$contactId, $id]);
                }
                
                $db->commit();
                
                // Get the quote reference number for the response
                $refStmt = $db->prepare("SELECT reference_number FROM quotes WHERE id = ?");
                $refStmt->execute([$id]);
                $refNumber = $refStmt->fetchColumn();
                
                ok(['id' => $id, 'reference_number' => $refNumber]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'clone_quote': {
            validateRequired($body, ['id']);
            $sourceId = (int)$body['id'];
            
            // Get source quote
            $stmt = $db->prepare("SELECT * FROM quotes WHERE id = ?");
            $stmt->execute([$sourceId]);
            $sourceQuote = $stmt->fetch();
            
            if (!$sourceQuote) fail('Devis source non trouvé', 404);
            
            $db->beginTransaction();
            
            try {
                // Generate new reference
                $yearMonth = date('Ym');
                $isFreeQuote = $sourceQuote['is_free_quote'] ?? false;
                $modelType = $sourceQuote['model_type'];
                $prefix = getQuotePrefix($modelType, (bool)$isFreeQuote);
                $maxIdStmt = $db->query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM quotes");
                $nextId = (int)$maxIdStmt->fetchColumn();
                $reference = sprintf('%s-%s-%06d', $prefix, $yearMonth, $nextId);
                
                $validUntil = date('Y-m-d', strtotime('+30 days'));
                
                // Clone the quote
                $stmt = $db->prepare("
                    INSERT INTO quotes (
                        reference_number, model_id, model_name, model_type,
                        base_price, options_total, total_price,
                        customer_name, customer_email, customer_phone,
                        customer_address, customer_message, contact_id,
                        status, valid_until, is_free_quote, quote_title,
                        margin_percent, photo_url, plan_url, cloned_from_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $reference,
                    $sourceQuote['model_id'],
                    $sourceQuote['model_name'],
                    $sourceQuote['model_type'],
                    $sourceQuote['base_price'],
                    $sourceQuote['options_total'],
                    $sourceQuote['total_price'],
                    $sourceQuote['customer_name'],
                    $sourceQuote['customer_email'],
                    $sourceQuote['customer_phone'],
                    $sourceQuote['customer_address'],
                    $sourceQuote['customer_message'],
                    $sourceQuote['contact_id'],
                    $validUntil,
                    $isFreeQuote ? 1 : 0,
                    $sourceQuote['quote_title'] ? $sourceQuote['quote_title'] . ' (copie)' : 'Copie',
                    $sourceQuote['margin_percent'] ?? 30,
                    $sourceQuote['photo_url'] ?? '',
                    $sourceQuote['plan_url'] ?? '',
                    $sourceId,
                ]);
                
                $newQuoteId = $db->lastInsertId();
                
                // Update reference with actual ID
                $reference = sprintf('%s-%s-%06d', $prefix, $yearMonth, $newQuoteId);
                $db->prepare("UPDATE quotes SET reference_number = ? WHERE id = ?")->execute([$reference, $newQuoteId]);

                // Set approval token (graceful – column may not exist until migration is run)
                try {
                    $db->prepare("UPDATE quotes SET approval_token = ? WHERE id = ?")
                       ->execute([bin2hex(random_bytes(32)), $newQuoteId]);
                } catch (Exception $tokenEx) { /* migration not yet applied */ }
                
                // Clone options
                $db->prepare("
                    INSERT INTO quote_options (quote_id, option_id, option_name, option_price)
                    SELECT ?, option_id, option_name, option_price
                    FROM quote_options WHERE quote_id = ?
                ")->execute([$newQuoteId, $sourceId]);
                
                // Clone categories and lines for free quotes
                if ($isFreeQuote) {
                    $catStmt = $db->prepare("SELECT * FROM quote_categories WHERE quote_id = ? ORDER BY display_order");
                    $catStmt->execute([$sourceId]);
                    $categories = $catStmt->fetchAll();
                    
                    foreach ($categories as $cat) {
                        $insertCatStmt = $db->prepare("
                            INSERT INTO quote_categories (quote_id, name, display_order)
                            VALUES (?, ?, ?)
                        ");
                        $insertCatStmt->execute([$newQuoteId, $cat['name'], $cat['display_order']]);
                        $newCatId = $db->lastInsertId();
                        
                        $db->prepare("
                            INSERT INTO quote_lines (category_id, description, quantity, unit, unit_cost_ht, margin_percent, display_order)
                            SELECT ?, description, quantity, unit, unit_cost_ht, margin_percent, display_order
                            FROM quote_lines WHERE category_id = ?
                        ")->execute([$newCatId, $cat['id']]);
                    }
                }
                
                $db->commit();
                ok(['id' => $newQuoteId, 'reference_number' => $reference]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'get_quote_categories': {
            validateRequired($body, ['quote_id']);
            $quoteId = (int)$body['quote_id'];
            
            $stmt = $db->prepare("
                SELECT qc.*, 
                    COALESCE(SUM(ROUND(ql.quantity * ql.unit_cost_ht, 2)), 0) AS total_cost_ht,
                    COALESCE(SUM(ROUND(ql.quantity * ql.unit_cost_ht * (1 + ql.margin_percent / 100), 2)), 0) AS total_sale_price_ht
                FROM quote_categories qc
                LEFT JOIN quote_lines ql ON qc.id = ql.category_id
                WHERE qc.quote_id = ?
                GROUP BY qc.id
                ORDER BY qc.display_order ASC
            ");
            $stmt->execute([$quoteId]);
            ok($stmt->fetchAll());
            break;
        }

        case 'get_quote_lines': {
            validateRequired($body, ['category_id']);
            $categoryId = (int)$body['category_id'];
            
            $stmt = $db->prepare("
                SELECT ql.*,
                    ROUND(ql.quantity * ql.unit_cost_ht, 2) AS total_cost_ht,
                    ROUND(ql.quantity * ql.unit_cost_ht * (1 + ql.margin_percent / 100), 2) AS sale_price_ht
                FROM quote_lines ql
                WHERE ql.category_id = ?
                ORDER BY ql.display_order ASC
            ");
            $stmt->execute([$categoryId]);
            ok($stmt->fetchAll());
            break;
        }

        case 'get_quote_with_details': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            
            // Get quote
            $stmt = $db->prepare("
                SELECT q.*, m.name as model_display_name, m.type as model_display_type
                FROM quotes q
                LEFT JOIN models m ON q.model_id = m.id
                WHERE q.id = ?
            ");
            $stmt->execute([$id]);
            $quote = $stmt->fetch();
            
            if (!$quote) fail('Devis non trouvé', 404);
            $quote['is_free_quote'] = (bool)$quote['is_free_quote'];

            // Fallback: use model's primary photo/plan when quote has none
            if (empty($quote['photo_url']) && !empty($quote['model_id'])) {
                $photoStmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'photo' ORDER BY is_primary DESC, id DESC LIMIT 1");
                $photoStmt->execute([(int)$quote['model_id']]);
                $row = $photoStmt->fetch();
                if ($row) $quote['photo_url'] = '/' . ltrim($row['file_path'], '/');
            }
            if (empty($quote['plan_url']) && !empty($quote['model_id'])) {
                $planStmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'plan' ORDER BY is_primary DESC, id DESC LIMIT 1");
                $planStmt->execute([(int)$quote['model_id']]);
                $row = $planStmt->fetch();
                if ($row) $quote['plan_url'] = '/' . ltrim($row['file_path'], '/');
            }

            // Get quote options with BOQ detail lines
            $modelId = (int)($quote['model_id'] ?? 0);
            $optStmt = $db->prepare("
                SELECT qo.option_id, qo.option_name, qo.option_price,
                       COALESCE(oc.name, 'Options') as category_name,
                       COALESCE(oc.display_order, 0) as category_order,
                       COALESCE(mo.display_order, 0) as option_order,
                       COALESCE(GROUP_CONCAT(bl.description ORDER BY bl.display_order ASC, bl.id ASC SEPARATOR ', '), '') AS option_details
                FROM quote_options qo
                LEFT JOIN model_options mo ON qo.option_id = mo.id
                LEFT JOIN option_categories oc ON mo.category_id = oc.id
                LEFT JOIN boq_categories bc ON bc.name = qo.option_name
                    AND bc.model_id = ?
                    AND bc.is_option = TRUE
                LEFT JOIN boq_lines bl ON bl.category_id = bc.id
                WHERE qo.quote_id = ?
                GROUP BY qo.id, qo.option_id, qo.option_name, qo.option_price, oc.name, oc.display_order, mo.display_order
                ORDER BY category_order ASC, option_order ASC
            ");
            $optStmt->execute([$modelId, $id]);
            $quote['options'] = $optStmt->fetchAll();
            
            // Get categories and lines (for free quotes)
            if ($quote['is_free_quote']) {
                $catStmt = $db->prepare("
                    SELECT qc.*, 
                        COALESCE(SUM(ROUND(ql.quantity * ql.unit_cost_ht, 2)), 0) AS total_cost_ht,
                        COALESCE(SUM(ROUND(ql.quantity * ql.unit_cost_ht * (1 + ql.margin_percent / 100), 2)), 0) AS total_sale_price_ht
                    FROM quote_categories qc
                    LEFT JOIN quote_lines ql ON qc.id = ql.category_id
                    WHERE qc.quote_id = ?
                    GROUP BY qc.id
                    ORDER BY qc.display_order ASC
                ");
                $catStmt->execute([$id]);
                $categories = $catStmt->fetchAll();
                
                foreach ($categories as &$cat) {
                    $lineStmt = $db->prepare("
                        SELECT ql.*,
                            ROUND(ql.quantity * ql.unit_cost_ht, 2) AS total_cost_ht,
                            ROUND(ql.quantity * ql.unit_cost_ht * (1 + ql.margin_percent / 100), 2) AS sale_price_ht
                        FROM quote_lines ql
                        WHERE ql.category_id = ?
                        ORDER BY ql.display_order ASC
                    ");
                    $lineStmt->execute([$cat['id']]);
                    $cat['lines'] = $lineStmt->fetchAll();
                }
                $quote['categories'] = $categories;
            } elseif (!empty($quote['model_id'])) {
                // For model-based quotes, fetch the BOQ base price breakdown (top-level categories with subcategories)
                $modelId = (int)$quote['model_id'];

                // Helper: cast a raw boq_lines row to the PDF line shape
                $castBoqLine = function(array $ln): array {
                    return [
                        'description'    => $ln['description'],
                        'quantity'       => (float)$ln['quantity'],
                        'unit'           => $ln['unit'],
                        'unit_cost_ht'   => (float)$ln['unit_cost_ht'],
                        'margin_percent' => (float)$ln['margin_percent'],
                        'sale_price_ht'  => (float)$ln['sale_price_ht'],
                    ];
                };

                // Helper: sum sale_price_ht for a set of raw lines
                $sumLines = function(array $lines): float {
                    return round(array_sum(array_map(fn($ln) => (float)$ln['sale_price_ht'], $lines)), 2);
                };

                // Fetch top-level base categories (not options, no parent)
                $topCatStmt = $db->prepare("
                    SELECT bc.id, bc.name, bc.display_order
                    FROM boq_categories bc
                    WHERE bc.model_id = ? AND bc.is_option = FALSE AND bc.parent_id IS NULL
                    ORDER BY bc.display_order ASC, bc.name ASC
                ");
                $topCatStmt->execute([$modelId]);
                $topCats = $topCatStmt->fetchAll();

                $subCatStmt = $db->prepare("
                    SELECT bc.id, bc.name, bc.display_order
                    FROM boq_categories bc
                    WHERE bc.model_id = ? AND bc.is_option = FALSE AND bc.parent_id = ?
                    ORDER BY bc.display_order ASC, bc.name ASC
                ");

                $boqLineStmt = $db->prepare("
                    SELECT bl.description, bl.quantity, bl.unit,
                           COALESCE(ppl.unit_price, bl.unit_cost_ht) AS unit_cost_ht,
                           bl.margin_percent,
                           ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2) AS sale_price_ht
                    FROM boq_lines bl
                    LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                    WHERE bl.category_id = ?
                    ORDER BY bl.display_order ASC, bl.id ASC
                ");

                $baseCategories = [];
                foreach ($topCats as $topCat) {
                    $topId = (int)$topCat['id'];

                    $subCatStmt->execute([$modelId, $topId]);
                    $subCats = $subCatStmt->fetchAll();

                    if (!empty($subCats)) {
                        $subcategories = [];
                        $catTotal = 0.0;
                        foreach ($subCats as $subCat) {
                            $boqLineStmt->execute([(int)$subCat['id']]);
                            $rawLines = $boqLineStmt->fetchAll();
                            $subTotal = $sumLines($rawLines);
                            $catTotal += $subTotal;
                            $subcategories[] = [
                                'name'                => $subCat['name'],
                                'total_sale_price_ht' => $subTotal,
                                'lines'               => array_map($castBoqLine, $rawLines),
                            ];
                        }
                        $baseCategories[] = [
                            'name'                => $topCat['name'],
                            'total_sale_price_ht' => round($catTotal, 2),
                            'subcategories'       => $subcategories,
                            'lines'               => [],
                        ];
                    } else {
                        // No subcategories – attach lines directly to the top category
                        $boqLineStmt->execute([$topId]);
                        $rawLines = $boqLineStmt->fetchAll();
                        $baseCategories[] = [
                            'name'                => $topCat['name'],
                            'total_sale_price_ht' => $sumLines($rawLines),
                            'subcategories'       => [],
                            'lines'               => array_map($castBoqLine, $rawLines),
                        ];
                    }
                }

                $quote['base_categories'] = $baseCategories;
            }
            
            ok($quote);
            break;
        }

        case 'get_quote_by_token': {
            validateRequired($body, ['token']);
            $token = sanitize($body['token']);

            $stmt = $db->prepare("
                SELECT q.*, m.name as model_display_name, m.type as model_display_type
                FROM quotes q
                LEFT JOIN models m ON q.model_id = m.id
                WHERE q.approval_token = ?
            ");
            $stmt->execute([$token]);
            $quote = $stmt->fetch();
            if (!$quote) fail('Devis non trouvé ou lien invalide', 404);
            $quote['is_free_quote'] = (bool)$quote['is_free_quote'];

            // Fallback: use model's primary photo/plan when quote has none
            if (empty($quote['photo_url']) && !empty($quote['model_id'])) {
                $photoStmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'photo' ORDER BY is_primary DESC, id DESC LIMIT 1");
                $photoStmt->execute([(int)$quote['model_id']]);
                $row = $photoStmt->fetch();
                if ($row) $quote['photo_url'] = '/' . ltrim($row['file_path'], '/');
            }
            if (empty($quote['plan_url']) && !empty($quote['model_id'])) {
                $planStmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'plan' ORDER BY is_primary DESC, id DESC LIMIT 1");
                $planStmt->execute([(int)$quote['model_id']]);
                $row = $planStmt->fetch();
                if ($row) $quote['plan_url'] = '/' . ltrim($row['file_path'], '/');
            }

            // Options with BOQ detail lines
            $modelId = (int)($quote['model_id'] ?? 0);
            $optStmt = $db->prepare("
                SELECT qo.option_id, qo.option_name, qo.option_price,
                       COALESCE(oc.name, 'Options') as category_name,
                       COALESCE(oc.display_order, 0) as category_order,
                       COALESCE(mo.display_order, 0) as option_order,
                       COALESCE(GROUP_CONCAT(bl.description ORDER BY bl.display_order ASC, bl.id ASC SEPARATOR ', '), '') AS option_details
                FROM quote_options qo
                LEFT JOIN model_options mo ON qo.option_id = mo.id
                LEFT JOIN option_categories oc ON mo.category_id = oc.id
                LEFT JOIN boq_categories bc ON bc.name = qo.option_name
                    AND bc.model_id = ?
                    AND bc.is_option = TRUE
                LEFT JOIN boq_lines bl ON bl.category_id = bc.id
                WHERE qo.quote_id = ?
                GROUP BY qo.id, qo.option_id, qo.option_name, qo.option_price, oc.name, oc.display_order, mo.display_order
                ORDER BY category_order ASC, option_order ASC
            ");
            $optStmt->execute([$modelId, $quote['id']]);
            $quote['options'] = $optStmt->fetchAll();

            // Categories for free quotes
            if ($quote['is_free_quote']) {
                $catStmt = $db->prepare("
                    SELECT qc.*,
                        COALESCE(SUM(ROUND(ql.quantity * ql.unit_cost_ht * (1 + ql.margin_percent / 100), 2)), 0) AS total_sale_price_ht
                    FROM quote_categories qc
                    LEFT JOIN quote_lines ql ON qc.id = ql.category_id
                    WHERE qc.quote_id = ?
                    GROUP BY qc.id ORDER BY qc.display_order ASC
                ");
                $catStmt->execute([$quote['id']]);
                $categories = $catStmt->fetchAll();
                foreach ($categories as &$cat) {
                    $lineStmt = $db->prepare("
                        SELECT ql.*,
                            ROUND(ql.quantity * ql.unit_cost_ht * (1 + ql.margin_percent / 100), 2) AS sale_price_ht
                        FROM quote_lines ql WHERE ql.category_id = ? ORDER BY ql.display_order ASC
                    ");
                    $lineStmt->execute([$cat['id']]);
                    $cat['lines'] = $lineStmt->fetchAll();
                }
                $quote['categories'] = $categories;
            }

            ok($quote);
            break;
        }

        case 'update_quote_status_by_token': {
            validateRequired($body, ['token', 'status']);
            $token = sanitize($body['token']);
            $validStatuses = ['approved', 'rejected', 'open'];
            if (!in_array($body['status'], $validStatuses)) fail('Statut invalide');

            $stmt = $db->prepare("SELECT id, status, customer_email, customer_name, reference_number, model_name, total_price FROM quotes WHERE approval_token = ?");
            $stmt->execute([$token]);
            $quote = $stmt->fetch();
            if (!$quote) fail('Devis non trouvé ou lien invalide', 404);

            $newStatus = $body['status'];
            $db->prepare("UPDATE quotes SET status = ?, updated_at = NOW() WHERE approval_token = ?")
               ->execute([$newStatus, $token]);
            ok(['id' => $quote['id'], 'status' => $newStatus,
                'customer_email' => $quote['customer_email'],
                'customer_name'  => $quote['customer_name'],
                'reference_number' => $quote['reference_number'],
                'model_name'     => $quote['model_name'],
                'total_price'    => $quote['total_price']]);
            break;
        }

        // === CONTACTS
        case 'get_contacts': {
            $stmt = $db->prepare("
                SELECT c.*, 
                    (SELECT COUNT(*) FROM quotes WHERE contact_id = c.id) as quote_count,
                    (SELECT SUM(total_price) FROM quotes WHERE contact_id = c.id) as total_revenue
                FROM contacts c
                ORDER BY c.created_at DESC
            ");
            $stmt->execute();
            ok($stmt->fetchAll());
            break;
        }

        case 'get_contact': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            
            // Get contact
            $stmt = $db->prepare("SELECT * FROM contacts WHERE id = ?");
            $stmt->execute([$id]);
            $contact = $stmt->fetch();
            
            if (!$contact) fail('Contact non trouvé', 404);
            
            // Get contact's quotes with financial details
            $quotesStmt = $db->prepare("
                SELECT 
                    q.id,
                    q.reference_number,
                    q.model_name,
                    q.base_price,
                    q.options_total,
                    q.total_price,
                    q.status,
                    q.created_at,
                    q.valid_until
                FROM quotes q
                WHERE q.contact_id = ?
                ORDER BY q.created_at DESC
            ");
            $quotesStmt->execute([$id]);
            $contact['quotes'] = $quotesStmt->fetchAll();
            
            // Calculate totals
            $contact['total_quotes'] = count($contact['quotes']);
            $contact['total_revenue'] = array_sum(array_column($contact['quotes'], 'total_price'));
            
            ok($contact);
            break;
        }

        case 'get_contact_by_device': {
            validateRequired($body, ['device_id']);
            $deviceId = sanitize($body['device_id']);
            
            // Find the most recent contact with this device_id
            $stmt = $db->prepare("
                SELECT id, name, email, phone, address 
                FROM contacts 
                WHERE device_id = ?
                ORDER BY updated_at DESC
                LIMIT 1
            ");
            $stmt->execute([$deviceId]);
            $contact = $stmt->fetch();
            
            ok($contact ?: null);
            break;
        }

        case 'update_contact': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            
            $updates = [];
            $params = [];
            
            if (isset($body['name'])) {
                $updates[] = "name = ?";
                $params[] = sanitize($body['name']);
            }
            if (isset($body['email'])) {
                $updates[] = "email = ?";
                $params[] = sanitize($body['email']);
            }
            if (isset($body['phone'])) {
                $updates[] = "phone = ?";
                $params[] = sanitize($body['phone']);
            }
            if (isset($body['address'])) {
                $updates[] = "address = ?";
                $params[] = sanitize($body['address']);
            }
            if (isset($body['status'])) {
                $validStatuses = ['new', 'read', 'replied', 'archived'];
                if (!in_array($body['status'], $validStatuses)) {
                    fail('Statut invalide');
                }
                $updates[] = "status = ?";
                $params[] = $body['status'];
            }
            
            if (empty($updates)) {
                fail('Aucune mise à jour fournie');
            }
            
            $params[] = $id;
            $stmt = $db->prepare("UPDATE contacts SET " . implode(", ", $updates) . ", updated_at = NOW() WHERE id = ?");
            $stmt->execute($params);
            ok();
            break;
        }

        case 'delete_contact': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            
            // Set contact_id to NULL in related quotes (don't delete quotes)
            $db->prepare("UPDATE quotes SET contact_id = NULL WHERE contact_id = ?")->execute([$id]);
            
            // Delete contact
            $stmt = $db->prepare("DELETE FROM contacts WHERE id = ?");
            $stmt->execute([$id]);
            ok();
            break;
        }

        // === EMAIL TEMPLATES
        case 'get_email_templates': {
            // Filter by template_type if provided
            $templateType = $body['template_type'] ?? null;
            if ($templateType) {
                $stmt = $db->prepare("SELECT * FROM email_templates WHERE template_type = ? ORDER BY name, template_key");
                $stmt->execute([$templateType]);
            } else {
                $stmt = $db->query("SELECT * FROM email_templates ORDER BY template_type, name, template_key");
            }
            ok($stmt->fetchAll());
            break;
        }

        case 'create_email_template': {
            validateRequired($body, ['template_key', 'subject', 'body_html']);
            
            // Check if template_key already exists
            $checkStmt = $db->prepare("SELECT COUNT(*) FROM email_templates WHERE template_key = ?");
            $checkStmt->execute([sanitize($body['template_key'])]);
            if ($checkStmt->fetchColumn() > 0) {
                fail('Un template avec cette clé existe déjà', 400);
            }
            
            // Validate template_type
            $validTypes = ['quote', 'notification', 'password_reset', 'contact', 'status_change', 'other'];
            $templateType = $body['template_type'] ?? 'other';
            if (!in_array($templateType, $validTypes)) {
                $templateType = 'other';
            }
            
            $stmt = $db->prepare("
                INSERT INTO email_templates (template_key, template_type, name, description, subject, body_html, body_text, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['template_key']),
                $templateType,
                sanitize($body['name'] ?? $body['template_key']),
                sanitize($body['description'] ?? ''),
                sanitize($body['subject']),
                $body['body_html'],
                $body['body_text'] ?? '',
                isset($body['is_active']) ? ($body['is_active'] ? 1 : 0) : 1
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_email_template': {
            validateRequired($body, ['template_key', 'subject', 'body_html']);
            
            // Validate template_type if provided
            $validTypes = ['quote', 'notification', 'password_reset', 'contact', 'status_change', 'other'];
            $templateType = $body['template_type'] ?? null;
            if ($templateType && !in_array($templateType, $validTypes)) {
                $templateType = 'other';
            }
            
            if ($templateType) {
                $stmt = $db->prepare("
                    UPDATE email_templates 
                    SET template_type = ?, name = ?, description = ?, subject = ?, body_html = ?, body_text = ?, updated_at = NOW()
                    WHERE template_key = ?
                ");
                $stmt->execute([
                    $templateType,
                    sanitize($body['name'] ?? $body['template_key']),
                    sanitize($body['description'] ?? ''),
                    sanitize($body['subject']),
                    $body['body_html'],
                    $body['body_text'] ?? '',
                    $body['template_key']
                ]);
            } else {
                $stmt = $db->prepare("
                    UPDATE email_templates 
                    SET name = ?, description = ?, subject = ?, body_html = ?, body_text = ?, updated_at = NOW()
                    WHERE template_key = ?
                ");
                $stmt->execute([
                    sanitize($body['name'] ?? $body['template_key']),
                    sanitize($body['description'] ?? ''),
                    sanitize($body['subject']),
                    $body['body_html'],
                    $body['body_text'] ?? '',
                    $body['template_key']
                ]);
            }
            ok();
            break;
        }

        case 'delete_email_template': {
            validateRequired($body, ['template_key']);
            $stmt = $db->prepare("DELETE FROM email_templates WHERE template_key = ?");
            $stmt->execute([$body['template_key']]);
            ok();
            break;
        }

        case 'get_email_logs': {
            $limit = (int)($body['limit'] ?? 50);
            if ($limit < 1) $limit = 50;
            if ($limit > 500) $limit = 500;
            
            $stmt = $db->query("SELECT * FROM email_logs ORDER BY created_at DESC LIMIT " . $limit);
            ok($stmt->fetchAll());
            break;
        }

        // === EMAIL SIGNATURES ===
        case 'get_email_signatures': {
            $stmt = $db->query("SELECT * FROM email_signatures ORDER BY is_default DESC, name ASC");
            ok($stmt->fetchAll());
            break;
        }

        case 'create_email_signature': {
            validateRequired($body, ['signature_key', 'name', 'body_html']);
            
            // Check if signature_key already exists
            $checkStmt = $db->prepare("SELECT COUNT(*) FROM email_signatures WHERE signature_key = ?");
            $checkStmt->execute([sanitize($body['signature_key'])]);
            if ($checkStmt->fetchColumn() > 0) {
                fail('Une signature avec cette clé existe déjà', 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO email_signatures (signature_key, name, description, body_html, logo_url, photo_url, is_active, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['signature_key']),
                sanitize($body['name']),
                sanitize($body['description'] ?? ''),
                $body['body_html'],
                sanitize($body['logo_url'] ?? ''),
                sanitize($body['photo_url'] ?? ''),
                isset($body['is_active']) ? ($body['is_active'] ? 1 : 0) : 1,
                isset($body['is_default']) ? ($body['is_default'] ? 1 : 0) : 0
            ]);
            
            // If this is set as default, unset other defaults
            if (!empty($body['is_default'])) {
                $updateStmt = $db->prepare("UPDATE email_signatures SET is_default = 0 WHERE signature_key != ?");
                $updateStmt->execute([sanitize($body['signature_key'])]);
            }
            
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_email_signature': {
            validateRequired($body, ['signature_key', 'body_html']);
            
            $signatureKey = sanitize($body['signature_key']);
            
            $stmt = $db->prepare("
                UPDATE email_signatures 
                SET name = ?, description = ?, body_html = ?, logo_url = ?, photo_url = ?, is_active = ?, is_default = ?, updated_at = NOW()
                WHERE signature_key = ?
            ");
            $stmt->execute([
                sanitize($body['name'] ?? ''),
                sanitize($body['description'] ?? ''),
                $body['body_html'],
                sanitize($body['logo_url'] ?? ''),
                sanitize($body['photo_url'] ?? ''),
                isset($body['is_active']) ? ($body['is_active'] ? 1 : 0) : 1,
                isset($body['is_default']) ? ($body['is_default'] ? 1 : 0) : 0,
                $signatureKey
            ]);
            
            // If this is set as default, unset other defaults
            if (!empty($body['is_default'])) {
                $updateStmt = $db->prepare("UPDATE email_signatures SET is_default = 0 WHERE signature_key != ?");
                $updateStmt->execute([$signatureKey]);
            }
            
            ok();
            break;
        }

        case 'delete_email_signature': {
            validateRequired($body, ['signature_key']);
            $stmt = $db->prepare("DELETE FROM email_signatures WHERE signature_key = ?");
            $stmt->execute([sanitize($body['signature_key'])]);
            ok();
            break;
        }

        // === DEVELOPMENT IDEAS
        case 'get_dev_ideas': {
            $sql = "SELECT * FROM development_ideas ORDER BY priority_order ASC, created_at DESC";
            $stmt = $db->query($sql);
            ok($stmt->fetchAll());
            break;
        }

        case 'create_dev_idea': {
            validateRequired($body, ['name']);
            
            // Get max priority_order to place new idea at the end
            $maxOrder = (int)$db->query("SELECT COALESCE(MAX(priority_order), 0) FROM development_ideas")->fetchColumn();
            
            $stmt = $db->prepare("
                INSERT INTO development_ideas (name, script, statut, urgence, importance, priority_order)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                $body['script'] ?? '',
                $body['statut'] ?? 'non_demarree',
                $body['urgence'] ?? 'non_urgent',
                $body['importance'] ?? 'non_important',
                $maxOrder + 1,
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_dev_idea': {
            validateRequired($body, ['id', 'name']);
            $name = trim(sanitize($body['name']));
            if (empty($name)) {
                fail("Le nom de l'idée est requis");
            }
            $stmt = $db->prepare("
                UPDATE development_ideas SET
                    name = ?, script = ?, statut = ?, urgence = ?, importance = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $name,
                $body['script'] ?? '',
                $body['statut'] ?? 'non_demarree',
                $body['urgence'] ?? 'non_urgent',
                $body['importance'] ?? 'non_important',
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        case 'delete_dev_idea': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM development_ideas WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'reorder_dev_ideas': {
            validateRequired($body, ['orders']);
            $stmt = $db->prepare("UPDATE development_ideas SET priority_order = ? WHERE id = ?");
            foreach ($body['orders'] as $order) {
                $stmt->execute([(int)$order['priority_order'], (int)$order['id']]);
            }
            ok();
            break;
        }

        // ============================================
        // POOL BOQ VARIABLES
        // ============================================
        case 'get_pool_boq_variables': {
            $stmt = $db->query("SELECT * FROM pool_boq_variables ORDER BY display_order ASC");
            ok($stmt->fetchAll());
            break;
        }

        case 'create_pool_boq_variable': {
            validateRequired($body, ['name', 'label', 'formula']);
            $stmt = $db->prepare("
                INSERT INTO pool_boq_variables (name, label, unit, formula, display_order)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['label']),
                sanitize($body['unit'] ?? ''),
                sanitize($body['formula']),
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_pool_boq_variable': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE pool_boq_variables SET
                    name = ?, label = ?, unit = ?, formula = ?, display_order = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['label']),
                sanitize($body['unit'] ?? ''),
                sanitize($body['formula']),
                (int)($body['display_order'] ?? 0),
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        case 'delete_pool_boq_variable': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM pool_boq_variables WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ============================================
        // POOL BOQ PRICE LIST
        // ============================================
        case 'get_pool_boq_price_list': {
            $stmt = $db->query("
                SELECT pl.*, s.name AS supplier_name
                FROM pool_boq_price_list pl
                LEFT JOIN suppliers s ON pl.supplier_id = s.id
                ORDER BY pl.display_order ASC
            ");
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['unit_price'] = (float)$r['unit_price'];
                $r['has_vat']    = (bool)$r['has_vat'];
            }
            ok($rows);
            break;
        }

        case 'create_pool_boq_price_list_item': {
            validateRequired($body, ['name']);
            $stmt = $db->prepare("
                INSERT INTO pool_boq_price_list (name, unit, unit_price, has_vat, supplier_id, display_order)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['unit'] ?? 'unité'),
                (float)($body['unit_price'] ?? 0),
                isset($body['has_vat']) ? (int)(bool)$body['has_vat'] : 1,
                !empty($body['supplier_id']) ? (int)$body['supplier_id'] : null,
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_pool_boq_price_list_item': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE pool_boq_price_list SET
                    name = ?, unit = ?, unit_price = ?, has_vat = ?, supplier_id = ?, display_order = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['unit'] ?? 'unité'),
                (float)($body['unit_price'] ?? 0),
                isset($body['has_vat']) ? (int)(bool)$body['has_vat'] : 1,
                !empty($body['supplier_id']) ? (int)$body['supplier_id'] : null,
                (int)($body['display_order'] ?? 0),
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        case 'delete_pool_boq_price_list_item': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM pool_boq_price_list WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ============================================
        // POOL BOQ TEMPLATES
        // ============================================
        case 'get_pool_boq_templates': {
            $stmt = $db->query("SELECT * FROM pool_boq_templates ORDER BY is_default DESC, name ASC");
            $rows = $stmt->fetchAll();
            // Decode template_data JSON for each row
            foreach ($rows as &$row) {
                if (isset($row['template_data']) && is_string($row['template_data'])) {
                    $row['template_data'] = json_decode($row['template_data'], true);
                }
            }
            unset($row);
            ok($rows);
            break;
        }

        case 'create_pool_boq_template': {
            validateRequired($body, ['name']);
            $templateData = isset($body['template_data']) ? json_encode($body['template_data']) : null;
            $stmt = $db->prepare("
                INSERT INTO pool_boq_templates (name, description, is_default, template_data)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['description'] ?? ''),
                (bool)($body['is_default'] ?? false),
                $templateData,
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_pool_boq_template': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            // Build SET clauses dynamically – only update fields that are provided
            $sets = [];
            $params = [];
            if (array_key_exists('name', $body)) {
                $sets[] = 'name = ?';
                $params[] = sanitize($body['name']);
            }
            if (array_key_exists('description', $body)) {
                $sets[] = 'description = ?';
                $params[] = sanitize($body['description']);
            }
            if (array_key_exists('is_default', $body)) {
                $sets[] = 'is_default = ?';
                $params[] = (bool)$body['is_default'];
            }
            if (array_key_exists('template_data', $body)) {
                $sets[] = 'template_data = ?';
                $params[] = json_encode($body['template_data']);
            }
            if (empty($sets)) {
                ok();
                break;
            }
            $sets[] = 'updated_at = NOW()';
            $params[] = $id;
            $sql = "UPDATE pool_boq_templates SET " . implode(', ', $sets) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            ok();
            break;
        }

        case 'delete_pool_boq_template': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM pool_boq_templates WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'get_pool_boq_template_by_id': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("SELECT * FROM pool_boq_templates WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            $row = $stmt->fetch();
            if ($row && isset($row['template_data']) && is_string($row['template_data'])) {
                $row['template_data'] = json_decode($row['template_data'], true);
            }
            ok($row ?: null);
            break;
        }

        case 'get_default_pool_boq_template': {
            $stmt = $db->prepare("SELECT * FROM pool_boq_templates WHERE is_default = 1 LIMIT 1");
            $stmt->execute();
            $row = $stmt->fetch();
            if ($row && isset($row['template_data']) && is_string($row['template_data'])) {
                $row['template_data'] = json_decode($row['template_data'], true);
            }
            ok($row ?: null);
            break;
        }

        // ============================================
        // === MODEL TYPES (admin-managed dynamic types)
        // ============================================
        case 'get_model_types': {
            $activeOnly = $body['active_only'] ?? false;
            $sql = "SELECT * FROM model_types";
            if ($activeOnly) $sql .= " WHERE is_active = 1";
            $sql .= " ORDER BY display_order ASC, name ASC";
            $rows = $db->query($sql)->fetchAll();
            foreach ($rows as &$r) {
                $r['is_active'] = (bool)$r['is_active'];
                $r['display_order'] = (int)$r['display_order'];
            }
            ok($rows);
            break;
        }

        case 'create_model_type': {
            requireAdmin();
            validateRequired($body, ['name', 'slug']);
            // Validate slug: only lowercase alphanumeric and hyphens
            $slug = preg_replace('/[^a-z0-9\-]/', '', strtolower(trim($body['slug'])));
            if (empty($slug)) fail('Slug invalide (caractères autorisés: a-z 0-9 -)');
            if (in_array($slug, ['container', 'pool'])) fail('Ce slug est réservé');
            $stmt = $db->prepare("
                INSERT INTO model_types (slug, name, description, icon_name, display_order, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $slug,
                trim($body['name']),
                $body['description'] ?? null,
                $body['icon_name']   ?? 'Box',
                (int)($body['display_order'] ?? 0),
                isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1,
            ]);
            ok(['id' => (int)$db->lastInsertId(), 'slug' => $slug]);
            break;
        }

        case 'update_model_type': {
            requireAdmin();
            validateRequired($body, ['id']);
            $sets   = [];
            $params = [];
            if (isset($body['name']))          { $sets[] = 'name = ?';          $params[] = trim($body['name']); }
            if (isset($body['description']))   { $sets[] = 'description = ?';   $params[] = $body['description']; }
            if (isset($body['icon_name']))     { $sets[] = 'icon_name = ?';     $params[] = $body['icon_name']; }
            if (isset($body['display_order'])) { $sets[] = 'display_order = ?'; $params[] = (int)$body['display_order']; }
            if (isset($body['is_active']))     { $sets[] = 'is_active = ?';     $params[] = (int)(bool)$body['is_active']; }
            if (empty($sets)) { ok(); break; }
            $params[] = (int)$body['id'];
            $db->prepare("UPDATE model_types SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
            ok();
            break;
        }

        case 'delete_model_type': {
            requireAdmin();
            validateRequired($body, ['id']);
            // Check for models using this type first
            $typeStmt = $db->prepare("SELECT slug FROM model_types WHERE id = ?");
            $typeStmt->execute([(int)$body['id']]);
            $typeRow = $typeStmt->fetch();
            if ($typeRow) {
                $usageStmt = $db->prepare("SELECT COUNT(*) FROM models WHERE type = ?");
                $usageStmt->execute([$typeRow['slug']]);
                if ((int)$usageStmt->fetchColumn() > 0) {
                    fail("Ce type est utilisé par des modèles existants. Supprimez ou reclassifiez ces modèles d'abord.");
                }
            }
            $db->prepare("DELETE FROM model_types WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ============================================
// === MODEL TYPE DIMENSIONS (per-type configurable dimensions)
        // ============================================
        case 'get_model_type_dimensions': {
            $slug = sanitize($body['model_type_slug'] ?? '');
            if (!$slug) fail('model_type_slug requis');
            $stmt = $db->prepare("SELECT * FROM model_type_dimensions WHERE model_type_slug = ? ORDER BY display_order ASC");
            $stmt->execute([$slug]);
            ok($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;
        }

        case 'create_model_type_dimension': {
            validateRequired($body, ['model_type_slug', 'slug', 'label']);
            $typeSlug = sanitize($body['model_type_slug']);
            $dimSlug  = preg_replace('/[^a-z0-9_]/', '_', strtolower(sanitize($body['slug'])));
            $stmt = $db->prepare("
                INSERT INTO model_type_dimensions
                    (model_type_slug, slug, label, unit, min_value, max_value, step, default_value, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $typeSlug, $dimSlug, sanitize($body['label']),
                sanitize($body['unit'] ?? 'm'),
                (float)($body['min_value'] ?? 0),
                (float)($body['max_value'] ?? 1000),
                (float)($body['step'] ?? 0.5),
                (float)($body['default_value'] ?? 1),
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_model_type_dimension': {
            validateRequired($body, ['id']);
            $fields = []; $params = [];
            foreach (['label','unit','min_value','max_value','step','default_value','display_order'] as $f) {
                if (!array_key_exists($f, $body)) continue;
                $fields[] = "$f = ?";
                if (in_array($f, ['min_value','max_value','step','default_value'])) $params[] = (float)$body[$f];
                elseif ($f === 'display_order') $params[] = (int)$body[$f];
                else $params[] = sanitize($body[$f]);
            }
            if (!$fields) fail('Nothing to update');
            $params[] = (int)$body['id'];
            $db->prepare("UPDATE model_type_dimensions SET ".implode(', ', $fields)." WHERE id = ?")->execute($params);
            ok();
            break;
        }

        case 'delete_model_type_dimension': {
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM model_type_dimensions WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // === MODULAR BOQ VARIABLES
        // ============================================
        case 'get_modular_boq_variables': {
            $typeSlug = isset($body['model_type_slug']) ? sanitize($body['model_type_slug']) : null;
            if ($typeSlug !== null && $typeSlug !== '') {
                $stmt = $db->prepare("SELECT * FROM modular_boq_variables WHERE model_type_slug = ? ORDER BY display_order ASC");
                $stmt->execute([$typeSlug]);
            } else {
                $stmt = $db->query("SELECT * FROM modular_boq_variables ORDER BY display_order ASC");
            }
            ok($stmt->fetchAll());
            break;
        }

        case 'create_modular_boq_variable': {
            validateRequired($body, ['name', 'label', 'formula']);
            $varTypeSlug = isset($body['model_type_slug']) ? sanitize($body['model_type_slug']) : null;
            $stmt = $db->prepare("
                INSERT INTO modular_boq_variables (model_type_slug, name, label, unit, formula, display_order)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $varTypeSlug ?: null,
                $body['name'],
                $body['label'],
                $body['unit'] ?? '',
                $body['formula'],
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_modular_boq_variable': {
            validateRequired($body, ['id', 'name', 'label', 'formula']);
            $varTypeSlug = isset($body['model_type_slug']) ? sanitize($body['model_type_slug']) : null;
            $stmt = $db->prepare("
                UPDATE modular_boq_variables SET
                    model_type_slug = ?,
                    name          = ?,
                    label         = ?,
                    unit          = ?,
                    formula       = ?,
                    display_order = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $varTypeSlug ?: null,
                $body['name'],
                $body['label'],
                $body['unit'] ?? '',
                $body['formula'],
                (int)($body['display_order'] ?? 0),
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        case 'delete_modular_boq_variable': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM modular_boq_variables WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ============================================
        // === MODULAR BOQ PRICE LIST (redirected to pool_boq_price_list — unified pricelist)
        // ============================================
        case 'get_modular_boq_price_list': {
            $stmt = $db->query("
                SELECT pl.*, s.name AS supplier_name
                FROM pool_boq_price_list pl
                LEFT JOIN suppliers s ON pl.supplier_id = s.id
                ORDER BY pl.display_order ASC, pl.name ASC
            ");
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['unit_price'] = (float)$r['unit_price'];
                $r['has_vat']    = (bool)$r['has_vat'];
            }
            ok($rows);
            break;
        }

        case 'create_modular_boq_price_list_item': {
            validateRequired($body, ['name']);
            $stmt = $db->prepare("
                INSERT INTO pool_boq_price_list (name, unit, unit_price, has_vat, supplier_id, display_order)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $body['name'],
                $body['unit']          ?? 'unité',
                (float)($body['unit_price'] ?? 0),
                isset($body['has_vat']) ? (int)(bool)$body['has_vat'] : 1,
                isset($body['supplier_id']) ? (int)$body['supplier_id'] : null,
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_modular_boq_price_list_item': {
            validateRequired($body, ['id', 'name']);
            $stmt = $db->prepare("
                UPDATE pool_boq_price_list SET
                    name          = ?,
                    unit          = ?,
                    unit_price    = ?,
                    has_vat       = ?,
                    supplier_id   = ?,
                    display_order = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $body['name'],
                $body['unit']          ?? 'unité',
                (float)($body['unit_price'] ?? 0),
                isset($body['has_vat']) ? (int)(bool)$body['has_vat'] : 1,
                isset($body['supplier_id']) ? (int)$body['supplier_id'] : null,
                (int)($body['display_order'] ?? 0),
                (int)$body['id'],
            ]);
            ok();
            break;
        }

        case 'delete_modular_boq_price_list_item': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM pool_boq_price_list WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ============================================
        // === MODULAR BOQ TEMPLATES
        // ============================================
        case 'get_modular_boq_templates': {
            $tplTypeSlug = isset($body['model_type_slug']) ? sanitize($body['model_type_slug']) : null;
            if ($tplTypeSlug !== null && $tplTypeSlug !== '') {
                $stmt = $db->prepare("SELECT * FROM modular_boq_templates WHERE model_type_slug = ? ORDER BY is_default DESC, name ASC");
                $stmt->execute([$tplTypeSlug]);
            } else {
                $stmt = $db->query("SELECT * FROM modular_boq_templates ORDER BY is_default DESC, name ASC");
            }
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['is_default'] = (bool)$r['is_default'];
                if (isset($r['template_data']) && is_string($r['template_data'])) {
                    $r['template_data'] = json_decode($r['template_data'], true);
                }
            }
            ok($rows);
            break;
        }

        case 'create_modular_boq_template': {
            validateRequired($body, ['name']);
            $tplTypeSlug = isset($body['model_type_slug']) ? sanitize($body['model_type_slug']) : null;
            $templateData = null;
            if (isset($body['template_data'])) {
                $templateData = is_string($body['template_data'])
                    ? $body['template_data']
                    : json_encode($body['template_data']);
            }
            $stmt = $db->prepare("
                INSERT INTO modular_boq_templates (model_type_slug, name, description, is_default, template_data)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $tplTypeSlug ?: null,
                $body['name'],
                $body['description'] ?? null,
                isset($body['is_default']) ? (int)(bool)$body['is_default'] : 0,
                $templateData,
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_modular_boq_template': {
            validateRequired($body, ['id']);
            $sets   = [];
            $params = [];
            if (array_key_exists('model_type_slug', $body)) { $sets[] = 'model_type_slug = ?'; $params[] = $body['model_type_slug'] ? sanitize($body['model_type_slug']) : null; }
            if (isset($body['name']))        { $sets[] = 'name = ?';        $params[] = $body['name']; }
            if (isset($body['description'])) { $sets[] = 'description = ?'; $params[] = $body['description']; }
            if (isset($body['is_default']))  { $sets[] = 'is_default = ?';  $params[] = (int)(bool)$body['is_default']; }
            if (isset($body['template_data'])) {
                $sets[]   = 'template_data = ?';
                $params[] = is_string($body['template_data'])
                    ? $body['template_data']
                    : json_encode($body['template_data']);
            }
            if (empty($sets)) { ok(); break; }
            $params[] = (int)$body['id'];
            $sql = "UPDATE modular_boq_templates SET " . implode(', ', $sets) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            ok();
            break;
        }

        case 'delete_modular_boq_template': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM modular_boq_templates WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'get_modular_boq_template_by_id': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("SELECT * FROM modular_boq_templates WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            $row = $stmt->fetch();
            if ($row && isset($row['template_data']) && is_string($row['template_data'])) {
                $row['template_data'] = json_decode($row['template_data'], true);
            }
            ok($row ?: null);
            break;
        }

        case 'get_default_modular_boq_template': {
            $tplTypeSlug = isset($body['model_type_slug']) ? sanitize($body['model_type_slug']) : null;
            if ($tplTypeSlug !== null && $tplTypeSlug !== '') {
                $stmt = $db->prepare("SELECT * FROM modular_boq_templates WHERE model_type_slug = ? AND is_default = 1 LIMIT 1");
                $stmt->execute([$tplTypeSlug]);
            } else {
                $stmt = $db->prepare("SELECT * FROM modular_boq_templates WHERE is_default = 1 LIMIT 1");
                $stmt->execute();
            }
            $row = $stmt->fetch();
            if ($row && isset($row['template_data']) && is_string($row['template_data'])) {
                $row['template_data'] = json_decode($row['template_data'], true);
            }
            ok($row ?: null);
            break;
        }

        // === get_modular_boq_full — returns all categories+lines for a modular model
        case 'get_modular_boq_full': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");

            $stmt = $db->prepare("
                SELECT bc.id, bc.name, bc.is_option, bc.qty_editable, bc.display_order, bc.parent_id
                FROM boq_categories bc
                WHERE bc.model_id = ?
                ORDER BY bc.display_order ASC, bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $categories = $stmt->fetchAll();

            $lineStmt = $db->prepare("
                SELECT bl.id, bl.description, bl.quantity, bl.quantity_formula,
                       bl.unit, bl.unit_cost_ht, bl.unit_cost_formula,
                       bl.price_list_id, bl.margin_percent, bl.display_order,
                       mp.unit_price AS price_list_unit_price
                FROM boq_lines bl
                LEFT JOIN pool_boq_price_list mp ON bl.price_list_id = mp.id
                WHERE bl.category_id = ?
                ORDER BY bl.display_order ASC, bl.id ASC
            ");

            foreach ($categories as &$cat) {
                $cat['id']           = (int)$cat['id'];
                $cat['is_option']    = (bool)$cat['is_option'];
                $cat['qty_editable'] = (bool)($cat['qty_editable'] ?? false);
                $cat['parent_id']    = $cat['parent_id'] ? (int)$cat['parent_id'] : null;
                $cat['display_order'] = (int)$cat['display_order'];
                $lineStmt->execute([$cat['id']]);
                $lines = $lineStmt->fetchAll();
                foreach ($lines as &$ln) {
                    $ln['id']                  = (int)$ln['id'];
                    $ln['quantity']            = (float)$ln['quantity'];
                    $ln['unit_cost_ht']        = (float)$ln['unit_cost_ht'];
                    $ln['margin_percent']      = (float)$ln['margin_percent'];
                    $ln['display_order']       = (int)$ln['display_order'];
                    $ln['price_list_id']       = $ln['price_list_id'] ? (int)$ln['price_list_id'] : null;
                    $ln['price_list_unit_price'] = $ln['price_list_unit_price'] !== null ? (float)$ln['price_list_unit_price'] : null;
                }
                $cat['lines'] = $lines;
            }

            ok($categories);
            break;
        }

        // === DISCOUNTS
        case 'get_discounts': {
            $stmt = $db->prepare("SELECT * FROM discounts ORDER BY start_date DESC, name ASC");
            $stmt->execute();
            $discounts = $stmt->fetchAll();
            foreach ($discounts as &$d) {
                // Fetch associated model ids
                $mStmt = $db->prepare("SELECT model_id FROM discount_models WHERE discount_id = ?");
                $mStmt->execute([$d['id']]);
                $d['model_ids'] = array_column($mStmt->fetchAll(), 'model_id');
                $d['discount_value'] = (float)$d['discount_value'];
                $d['is_active'] = (bool)$d['is_active'];
            }
            ok($discounts);
            break;
        }

        case 'create_discount': {
            validateRequired($body, ['name', 'discount_type', 'discount_value', 'apply_to', 'start_date', 'end_date']);
            $stmt = $db->prepare("
                INSERT INTO discounts (name, description, discount_type, discount_value, apply_to, start_date, end_date, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $body['name'],
                $body['description'] ?? null,
                $body['discount_type'],
                (float)$body['discount_value'],
                $body['apply_to'],
                $body['start_date'],
                $body['end_date'],
                isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1,
            ]);
            $discountId = (int)$db->lastInsertId();
            // Associate models
            if (!empty($body['model_ids']) && is_array($body['model_ids'])) {
                $mStmt = $db->prepare("INSERT IGNORE INTO discount_models (discount_id, model_id) VALUES (?, ?)");
                foreach ($body['model_ids'] as $modelId) {
                    $mStmt->execute([$discountId, (int)$modelId]);
                }
            }
            ok(['id' => $discountId]);
            break;
        }

        case 'update_discount': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            $sets = [];
            $params = [];
            if (array_key_exists('name', $body)) { $sets[] = 'name = ?'; $params[] = $body['name']; }
            if (array_key_exists('description', $body)) { $sets[] = 'description = ?'; $params[] = $body['description']; }
            if (array_key_exists('discount_type', $body)) { $sets[] = 'discount_type = ?'; $params[] = $body['discount_type']; }
            if (array_key_exists('discount_value', $body)) { $sets[] = 'discount_value = ?'; $params[] = (float)$body['discount_value']; }
            if (array_key_exists('apply_to', $body)) { $sets[] = 'apply_to = ?'; $params[] = $body['apply_to']; }
            if (array_key_exists('start_date', $body)) { $sets[] = 'start_date = ?'; $params[] = $body['start_date']; }
            if (array_key_exists('end_date', $body)) { $sets[] = 'end_date = ?'; $params[] = $body['end_date']; }
            if (array_key_exists('is_active', $body)) { $sets[] = 'is_active = ?'; $params[] = (int)(bool)$body['is_active']; }
            if (!empty($sets)) {
                $sets[] = 'updated_at = NOW()';
                $params[] = $id;
                $sql = "UPDATE discounts SET " . implode(', ', $sets) . " WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            }
            // Sync model associations
            if (array_key_exists('model_ids', $body) && is_array($body['model_ids'])) {
                $db->prepare("DELETE FROM discount_models WHERE discount_id = ?")->execute([$id]);
                $mStmt = $db->prepare("INSERT IGNORE INTO discount_models (discount_id, model_id) VALUES (?, ?)");
                foreach ($body['model_ids'] as $modelId) {
                    $mStmt->execute([$id, (int)$modelId]);
                }
            }
            ok();
            break;
        }

        case 'delete_discount': {
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM discounts WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'get_active_discounts': {
            $modelId = isset($body['model_id']) ? (int)$body['model_id'] : null;
            $today = date('Y-m-d');
            if ($modelId) {
                // Return discounts active today that apply to this model (global or explicitly associated)
                $stmt = $db->prepare("
                    SELECT d.*
                    FROM discounts d
                    WHERE d.is_active = 1
                      AND d.start_date <= ? AND d.end_date >= ?
                      AND (
                          NOT EXISTS (SELECT 1 FROM discount_models dm WHERE dm.discount_id = d.id)
                          OR EXISTS (SELECT 1 FROM discount_models dm WHERE dm.discount_id = d.id AND dm.model_id = ?)
                      )
                    ORDER BY d.discount_value DESC
                ");
                $stmt->execute([$today, $today, $modelId]);
            } else {
                $stmt = $db->prepare("
                    SELECT d.*
                    FROM discounts d
                    WHERE d.is_active = 1
                      AND d.start_date <= ? AND d.end_date >= ?
                    ORDER BY d.discount_value DESC
                ");
                $stmt->execute([$today, $today]);
            }
            $discounts = $stmt->fetchAll();
            foreach ($discounts as &$d) {
                $mStmt = $db->prepare("SELECT model_id FROM discount_models WHERE discount_id = ?");
                $mStmt->execute([$d['id']]);
                $d['model_ids'] = array_column($mStmt->fetchAll(), 'model_id');
                $d['discount_value'] = (float)$d['discount_value'];
                $d['is_active'] = (bool)$d['is_active'];
            }
            ok($discounts);
            break;
        }

        // =====================================================================
        // PROFESSIONAL USERS (admin management)
        // =====================================================================

        case 'get_pro_users': {
            $stmt = $db->query("
                SELECT u.id, u.name, u.email, u.role,
                       pp.company_name, pp.address, pp.vat_number, pp.brn_number,
                       pp.phone, pp.logo_url, pp.sunbox_margin_percent, pp.credits,
                       COALESCE(pp.model_request_cost, 5000) AS model_request_cost,
                       pp.is_active, pp.domain, pp.api_token, pp.db_name,
                       pp.theme_id,
                       pt.name AS theme_name
                FROM users u
                LEFT JOIN professional_profiles pp ON pp.user_id = u.id
                LEFT JOIN professional_themes pt ON pt.id = pp.theme_id
                WHERE u.role = 'professional'
                ORDER BY u.name ASC
            ");
            ok($stmt->fetchAll());
            break;
        }

        case 'create_pro_user': {
            validateRequired($body, ['name', 'email', 'password', 'company_name']);
            $passwordHash = password_hash((string)$body['password'], PASSWORD_BCRYPT);
            $apiToken = bin2hex(random_bytes(32));

            $db->beginTransaction();
            try {
                $stmt = $db->prepare("
                    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'professional')
                ");
                $stmt->execute([$body['name'], strtolower(trim($body['email'])), $passwordHash]);
                $userId = (int)$db->lastInsertId();

                $stmt = $db->prepare("
                    INSERT INTO professional_profiles
                        (user_id, company_name, address, vat_number, brn_number, phone, domain, api_token,
                         db_name, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ");
                $stmt->execute([
                    $userId,
                    $body['company_name'],
                    $body['address'] ?? '',
                    $body['vat_number'] ?? '',
                    $body['brn_number'] ?? '',
                    $body['phone'] ?? '',
                    $body['domain'] ?? '',
                    $apiToken,
                    $body['db_name'] ?? '',
                ]);
                $db->commit();
                ok(['id' => $userId, 'api_token' => $apiToken]);
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'update_pro_user': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];

            $userSets = [];
            $userParams = [];
            if (array_key_exists('name', $body)) { $userSets[] = 'name = ?'; $userParams[] = $body['name']; }
            if (array_key_exists('email', $body)) { $userSets[] = 'email = ?'; $userParams[] = strtolower(trim($body['email'])); }
            if (!empty($body['password'])) { $userSets[] = 'password_hash = ?'; $userParams[] = password_hash((string)$body['password'], PASSWORD_BCRYPT); }
            if (!empty($userSets)) {
                $userParams[] = $id;
                $db->prepare("UPDATE users SET " . implode(', ', $userSets) . " WHERE id = ?")->execute($userParams);
            }

            $profSets = [];
            $profParams = [];
            if (array_key_exists('company_name', $body)) { $profSets[] = 'company_name = ?'; $profParams[] = $body['company_name']; }
            if (array_key_exists('address', $body)) { $profSets[] = 'address = ?'; $profParams[] = $body['address']; }
            if (array_key_exists('vat_number', $body)) { $profSets[] = 'vat_number = ?'; $profParams[] = $body['vat_number']; }
            if (array_key_exists('brn_number', $body)) { $profSets[] = 'brn_number = ?'; $profParams[] = $body['brn_number']; }
            if (array_key_exists('phone', $body)) { $profSets[] = 'phone = ?'; $profParams[] = $body['phone']; }
            if (array_key_exists('domain', $body)) { $profSets[] = 'domain = ?'; $profParams[] = strtolower(trim($body['domain'])); }
            if (array_key_exists('logo_url', $body)) { $profSets[] = 'logo_url = ?'; $profParams[] = $body['logo_url']; }
            if (array_key_exists('db_name', $body)) { $profSets[] = 'db_name = ?'; $profParams[] = $body['db_name']; }
            if (array_key_exists('sunbox_margin_percent', $body)) { $profSets[] = 'sunbox_margin_percent = ?'; $profParams[] = (float)$body['sunbox_margin_percent']; }
            if (array_key_exists('model_request_cost', $body)) { $profSets[] = 'model_request_cost = ?'; $profParams[] = (float)$body['model_request_cost']; }
            if (array_key_exists('is_active', $body)) { $profSets[] = 'is_active = ?'; $profParams[] = (int)(bool)$body['is_active']; }
            if (array_key_exists('theme_id', $body)) { $profSets[] = 'theme_id = ?'; $profParams[] = $body['theme_id'] ? (int)$body['theme_id'] : null; }
            if (!empty($profSets)) {
                $profSets[] = 'updated_at = NOW()';
                $profParams[] = $id;
                $db->prepare("UPDATE professional_profiles SET " . implode(', ', $profSets) . " WHERE user_id = ?")->execute($profParams);
            }
            ok();
            break;
        }

        case 'regenerate_pro_token': {
            validateRequired($body, ['id']);
            $newToken = bin2hex(random_bytes(32));
            $db->prepare("UPDATE professional_profiles SET api_token = ?, updated_at = NOW() WHERE user_id = ?")->execute([$newToken, (int)$body['id']]);
            ok(['api_token' => $newToken]);
            break;
        }

        // ── Get Sunbox site deployment version log ────────────────────────────
        case 'get_sunbox_version': {
            requireAdmin();
            $webRoot    = rtrim(dirname(dirname(__FILE__)), '/'); // .../sunbox-mauritius.com
            $vFile      = $webRoot . '/.sunbox_version';
            $versionLog = is_file($vFile) ? trim((string)file_get_contents($vFile)) : '';
            ok(['version_log' => $versionLog ?: null]);
            break;
        }

        // ── Debug info (Sunbox admin) ─────────────────────────────────────────
        case 'get_debug_info': {
            requireAdmin();
            $info = [];

            // PHP environment
            $info['php'] = [
                'version'       => PHP_VERSION,
                'os'            => PHP_OS,
                'sapi'          => PHP_SAPI,
                'memory_limit'  => ini_get('memory_limit'),
                'max_exec_time' => ini_get('max_execution_time'),
                'upload_max'    => ini_get('upload_max_filesize'),
                'post_max'      => ini_get('post_max_size'),
                'error_log'     => ini_get('error_log') ?: null,
                'extensions'    => [
                    'zip'       => extension_loaded('zip'),
                    'pdo'       => extension_loaded('pdo'),
                    'pdo_mysql' => extension_loaded('pdo_mysql'),
                    'json'      => extension_loaded('json'),
                    'mbstring'  => extension_loaded('mbstring'),
                    'openssl'   => extension_loaded('openssl'),
                ],
            ];

            // Database
            try {
                $row = $db->query("SELECT VERSION() AS v, @@character_set_database AS cs, @@collation_database AS co")->fetch();
                $info['db'] = ['status' => 'ok', 'version' => $row['v'], 'charset' => $row['cs'], 'collation' => $row['co']];
            } catch (\Throwable $e) {
                $info['db'] = ['status' => 'error', 'error' => API_DEBUG ? $e->getMessage() : 'Connexion échouée'];
            }

            // Version constants
            $info['versions'] = [
                'pro_file'  => PRO_FILE_VERSION,
                'pro_db'    => PRO_DB_SCHEMA_VERSION,
                'sunbox_db' => SUNBOX_DB_SCHEMA_VERSION,
            ];

            // Server
            $info['server'] = [
                'software'  => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
                'timestamp' => date('Y-m-d H:i:s'),
                'timezone'  => date_default_timezone_get(),
            ];

            // Pro sites status
            $proSites = [];
            try {
                $stmt = $db->query("SELECT user_id, domain, db_name, company_name FROM professional_profiles WHERE domain IS NOT NULL AND domain != '' ORDER BY domain");
                while ($r = $stmt->fetch()) {
                    $siteDir = proSiteDir((string)$r['domain']);
                    $vFile   = $siteDir . '/.deploy_version';
                    $ver     = is_file($vFile) ? trim((string)file_get_contents($vFile)) : null;
                    $proSites[] = [
                        'user_id'          => $r['user_id'],
                        'domain'           => $r['domain'],
                        'company_name'     => $r['company_name'],
                        'db_name'          => $r['db_name'],
                        'deployed_version' => $ver,
                        'up_to_date'       => $ver ? version_compare($ver, PRO_FILE_VERSION) >= 0 : false,
                        'site_dir_exists'  => is_dir($siteDir),
                        'api_dir_exists'   => is_dir($siteDir . '/api'),
                    ];
                }
            } catch (\Throwable $e) {
                $proSites = ['error' => API_DEBUG ? $e->getMessage() : 'Requête échouée'];
            }
            $info['pro_sites'] = $proSites;

            // PHP error log tail (last 60 lines)
            $errorLogPath = ini_get('error_log');
            $logLines     = [];
            if ($errorLogPath && is_file($errorLogPath) && is_readable($errorLogPath)) {
                $all = @file($errorLogPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                if ($all !== false) {
                    $logLines = array_values(array_slice($all, -60));
                }
            }
            $info['error_log_tail']  = $logLines;
            $info['error_log_path']  = $errorLogPath ?: null;

            ok($info);
            break;
        }

        // ── Manually propagate API template files to all pro sites ─────────────
        case 'propagate_pro_api_files': {
            requireAdmin();
            $templateDir = __DIR__ . '/pro_deploy';
            $proFiles    = [
                $templateDir . '/api_index.php'         => 'index.php',
                $templateDir . '/api_config.php'        => 'config.php',
                $templateDir . '/api_pro_auth.php'      => 'pro_auth.php',
                $templateDir . '/api_upload_logo.php'   => 'upload_logo.php',
                $templateDir . '/api_upload_sketch.php' => 'upload_sketch.php',
            ];
            $prosDir    = rtrim(dirname(__DIR__), '/') . '/pros';
            $updated    = 0;
            $warnings   = [];

            if (!is_dir($prosDir)) {
                fail("Dossier pros introuvable: {$prosDir}", 404);
            }

            $proApiDirs = glob($prosDir . '/*/api');
            if ($proApiDirs === false) {
                fail("glob() échoué pour {$prosDir}");
            }

            foreach ($proApiDirs as $proApiDir) {
                if (!is_dir($proApiDir)) continue;
                foreach ($proFiles as $src => $destFile) {
                    if (!is_file($src)) {
                        $warnings[] = "Template introuvable: {$src}";
                        continue;
                    }
                    if (!copy($src, $proApiDir . '/' . $destFile)) {
                        $warnings[] = "Échec copie {$destFile} → {$proApiDir}";
                    }
                }
                // Also propagate root index.php (dynamic theme + images injection)
                $rootIndexSrc  = $templateDir . '/index.php';
                $rootIndexDest = dirname($proApiDir) . '/index.php';
                if (is_file($rootIndexSrc) && !copy($rootIndexSrc, $rootIndexDest)) {
                    $warnings[] = "Échec copie index.php → {$rootIndexDest}";
                }
                // Also propagate root .htaccess (fixes DirectoryIndex: ensures index.php
                // is executed for root requests instead of serving the static index.html)
                $rootHtaccessSrc  = $templateDir . '/htaccess';
                $rootHtaccessDest = dirname($proApiDir) . '/.htaccess';
                if (is_file($rootHtaccessSrc) && !copy($rootHtaccessSrc, $rootHtaccessDest)) {
                    $warnings[] = "Échec copie .htaccess → {$rootHtaccessDest}";
                }
                // Update .deploy_version
                @file_put_contents(dirname($proApiDir) . '/.deploy_version', PRO_FILE_VERSION);
                $updated++;
            }

            ok(['updated' => $updated, 'warnings' => $warnings, 'version' => PRO_FILE_VERSION]);
            break;
        }

        // ── Check deployed versions (files + DB schema) ───────────────────────
        case 'check_pro_versions': {
            validateRequired($body, ['user_id']);
            $userId = (int)$body['user_id'];

            $stmt = $db->prepare("SELECT pp.domain, pp.db_name FROM professional_profiles pp WHERE pp.user_id = ?");
            $stmt->execute([$userId]);
            $profile = $stmt->fetch();
            if (!$profile) fail('Utilisateur introuvable.');

            $domain = (string)($profile['domain'] ?? '');
            $dbName = (string)($profile['db_name'] ?? '');

            $result = [
                'latest_file_version'   => PRO_FILE_VERSION,
                'latest_db_version'     => PRO_DB_SCHEMA_VERSION,
                'current_file_version'  => null,
                'current_db_version'    => null,
                'files_up_to_date'      => false,
                'db_up_to_date'         => false,
                'domain_configured'     => (bool)$domain,
                'db_configured'         => (bool)$dbName,
            ];

            // Check deployed file version from .deploy_version file
            if ($domain) {
                $siteDir = proSiteDir($domain);
                $vFile   = $siteDir . '/.deploy_version';
                if (is_file($vFile)) {
                    $ver = trim((string)file_get_contents($vFile));
                    if ($ver) {
                        $result['current_file_version'] = $ver;
                        $result['files_up_to_date'] = version_compare($ver, PRO_FILE_VERSION, '>=');
                    }
                }
            }

            // Check DB schema version from pro_schema_version table
            if ($dbName) {
                try {
                    $proPdo = new PDO(
                        "mysql:host=" . DB_HOST . ";dbname={$dbName};charset=utf8mb4",
                        DB_USER, DB_PASS,
                        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
                    );
                    $vStmt = $proPdo->query("SELECT `version` FROM `pro_schema_version` WHERE `id` = 1 LIMIT 1");
                    if ($vStmt) {
                        $row = $vStmt->fetch(PDO::FETCH_ASSOC);
                        if ($row && !empty($row['version'])) {
                            $result['current_db_version'] = $row['version'];
                            $result['db_up_to_date'] = version_compare($row['version'], PRO_DB_SCHEMA_VERSION, '>=');
                        }
                    }
                } catch (\Throwable $e) {
                    // BD inaccessible ou table absente — needs init/update
                    $result['db_error'] = API_DEBUG ? $e->getMessage() : 'BD inaccessible ou non initialisée';
                }
            }

            ok($result);
            break;
        }

        // ── Deploy pro site files to /pros/<domain>/ on this server ────────────
        case 'deploy_pro_site': {
            validateRequired($body, ['user_id']);
            $userId = (int)$body['user_id'];

            $stmt = $db->prepare("
                SELECT pp.domain, pp.company_name, pp.db_name, pp.logo_url,
                       u.password_hash,
                       pp.theme_id,
                       pt.logo_position, pt.header_height, pt.header_bg_color,
                       pt.header_text_color, pt.font_family, pt.nav_position,
                       pt.nav_has_background, pt.nav_bg_color, pt.nav_text_color,
                       pt.nav_hover_color, pt.button_color, pt.button_text_color,
                       pt.footer_bg_color, pt.footer_text_color
                FROM professional_profiles pp
                JOIN users u ON u.id = pp.user_id
                LEFT JOIN professional_themes pt ON pt.id = pp.theme_id
                WHERE pp.user_id = ?
            ");
            $stmt->execute([$userId]);
            $profile = $stmt->fetch();
            if (!$profile || empty($profile['domain'])) {
                fail('Domaine non configuré pour cet utilisateur. Enregistrez d\'abord le domaine.');
            }

            $domain       = (string)$profile['domain'];
            $companyName  = (string)$profile['company_name'];
            $dbName       = (string)($profile['db_name'] ?? '');
            $passwordHash = (string)($profile['password_hash'] ?? '');

            $siteDir      = proSiteDir($domain);
            // The pro site is an addon domain pointing to siteDir, so its public URL
            // IS the domain itself (not a Sunbox subdirectory).
            $proBaseUrl   = 'https://' . $domain;
            $sunboxBaseUrl = rtrim((string)env('APP_URL', 'https://sunbox-mauritius.com'), '/');
            $result      = [
                'deployed'  => false,
                'site_dir'  => $siteDir,
                'site_url'  => $proBaseUrl,
                'db_name'   => $dbName,
                'errors'    => [],
                'debug'     => [],
            ];

            $result['debug'][] = 'api/__DIR__: ' . __DIR__;
            $result['debug'][] = 'siteDir: ' . $siteDir;

            try {
                // Create directories
                foreach ([$siteDir, $siteDir . '/api'] as $dir) {
                    if (!is_dir($dir)) {
                        if (!mkdir($dir, 0755, true)) {
                            throw new \Exception("mkdir échoué pour: $dir — vérifiez les permissions.");
                        }
                    }
                }
                $result['debug'][] = 'Répertoires créés.';

                $templateDir = __DIR__ . '/pro_deploy';
                if (!is_dir($templateDir)) {
                    throw new \Exception("Dossier templates introuvable: $templateDir");
                }

                $replacements = [
                    '{{DOMAIN}}'       => $domain,
                    '{{COMPANY_NAME}}' => $companyName,
                ];

                // Compute absolute logo URL now (used in both .env and fallback index.html)
                $logoUrlAbs = (string)($profile['logo_url'] ?? '');
                if ($logoUrlAbs !== '' && strpos($logoUrlAbs, 'http') !== 0) {
                    $logoUrlAbs = $sunboxBaseUrl . '/' . ltrim($logoUrlAbs, '/');
                }

                $filesToDeploy = [
                    'api_config.php'        => $siteDir . '/api/config.php',
                    'api_index.php'         => $siteDir . '/api/index.php',
                    'api_pro_auth.php'      => $siteDir . '/api/pro_auth.php',
                    'api_upload_logo.php'   => $siteDir . '/api/upload_logo.php',
                    'api_upload_sketch.php' => $siteDir . '/api/upload_sketch.php',
                    'api_htaccess'          => $siteDir . '/api/.htaccess',
                    'htaccess'              => $siteDir . '/.htaccess',
                    'index.php'             => $siteDir . '/index.php',
                ];
                foreach ($filesToDeploy as $tpl => $dest) {
                    $tplPath = $templateDir . '/' . $tpl;
                    if (!file_exists($tplPath)) {
                        throw new \Exception("Template introuvable: $tplPath");
                    }
                    $content = file_get_contents($tplPath);
                    if ($content === false) throw new \Exception("Lecture échouée: $tplPath");
                    $content = str_replace(array_keys($replacements), array_values($replacements), $content);
                    if (file_put_contents($dest, $content) === false) {
                        throw new \Exception("Écriture échouée: $dest — vérifiez les permissions.");
                    }
                }
                $result['debug'][] = 'Fichiers PHP déployés.';

                // Create symlink siteDir/assets → main site's /assets (same server, avoids CORS).
                // Apache mod_rewrite follows symlinks, so the JS/CSS will be served from the
                // pro's own domain (https://mrbcreativecontracting.com/assets/...) with no CORS issue.
                $mainAssetsDir = dirname(__DIR__) . '/assets';
                $proAssetsLink = $siteDir . '/assets';
                if (!file_exists($proAssetsLink) && !is_link($proAssetsLink)) {
                    if (is_dir($mainAssetsDir)) {
                        if (!symlink($mainAssetsDir, $proAssetsLink)) {
                            $result['errors'][] = 'Avertissement: symlink assets échoué. Créez-le manuellement via SSH: ln -s {sunbox_root}/assets {pro_site_dir}/assets';
                        } else {
                            $result['debug'][] = 'Symlink assets créé: ' . $proAssetsLink . ' → ' . $mainAssetsDir;
                        }
                    } else {
                        $result['errors'][] = 'Avertissement: dossier assets principal introuvable. Compilez le site (npm run build) d\'abord.';
                    }
                } else {
                    $result['debug'][] = 'Symlink/dossier assets déjà présent.';
                }

                // Deploy index.html — static fallback copy used by index.php if it cannot
                // read the Sunbox root index.html. index.php is the primary entry point now.
                $mainIndexPath = dirname(__DIR__) . '/index.html';
                if (file_exists($mainIndexPath)) {
                    $indexHtml = file_get_contents($mainIndexPath);
                    if ($indexHtml !== false) {
                        // Inject pro config: point the React app to this pro site's own /api
                        // and flag it as a pro site (hides admin-only features).
                        $apiUrlJson  = json_encode($proBaseUrl . '/api', JSON_HEX_TAG | JSON_HEX_AMP);
                        $logoJson    = json_encode($logoUrlAbs,   JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
                        $companyJson = json_encode($companyName,  JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
                        // Build theme object (null fields fall back to defaults in PublicLayout)
                        $themeData = null;
                        if (!empty($profile['theme_id'])) {
                            $themeData = [
                                'logo_position'      => $profile['logo_position'],
                                'header_height'      => $profile['header_height'],
                                'header_bg_color'    => $profile['header_bg_color'],
                                'header_text_color'  => $profile['header_text_color'],
                                'font_family'        => $profile['font_family'],
                                'nav_position'       => $profile['nav_position'],
                                'nav_has_background' => (bool)$profile['nav_has_background'],
                                'nav_bg_color'       => $profile['nav_bg_color'],
                                'nav_text_color'     => $profile['nav_text_color'],
                                'nav_hover_color'    => $profile['nav_hover_color'],
                                'button_color'       => $profile['button_color'],
                                'button_text_color'  => $profile['button_text_color'],
                                'footer_bg_color'    => $profile['footer_bg_color'],
                                'footer_text_color'  => $profile['footer_text_color'],
                            ];
                        }
                        $themeJson = json_encode($themeData, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
                        $proConfig   = '<script>'
                            . 'window.__API_BASE_URL__='    . $apiUrlJson   . ';'
                            . 'window.__PRO_SITE__=true;'
                            . 'window.__PRO_LOGO_URL__='    . $logoJson    . ';'
                            . 'window.__PRO_COMPANY_NAME__=' . $companyJson  . ';'
                            . 'window.__PRO_THEME__='        . $themeJson   . ';'
                            . '</script>';
                        $closeHeadPos = stripos($indexHtml, '</head>');
                        if ($closeHeadPos !== false) {
                            $indexHtml = substr($indexHtml, 0, $closeHeadPos) . $proConfig . substr($indexHtml, $closeHeadPos);
                        } else {
                            $indexHtml .= $proConfig;
                        }
                        if (file_put_contents($siteDir . '/index.html', $indexHtml) === false) {
                            $result['errors'][] = 'Avertissement: impossible d\'écrire index.html (fallback)';
                        } else {
                            $result['debug'][] = 'index.html (fallback) déployé.';
                        }
                    }
                } else {
                    $result['errors'][] = 'Avertissement: index.html introuvable (' . $mainIndexPath . '). Compilez le site (npm run build) d\'abord. index.php fonctionnera quand même.';
                }

                // Write a minimal pro-specific .env.
                // DB credentials (DB_HOST, DB_USER, DB_PASS) and the main Sunbox DB_NAME
                // are NOT written here — the pro site's api_config.php loads them
                // automatically from the Sunbox root .env (3 levels up).
                // Only pro-specific overrides are stored here.
                $envLines = [
                    '# Pro site config — DB credentials come from Sunbox root .env automatically.',
                    'APP_URL=' . $proBaseUrl,
                    'API_DEBUG=true',
                    '',
                    '# Pro user identifier in Sunbox DB (used for direct DB queries)',
                    'SUNBOX_USER_ID=' . $userId,
                    '',
                    '# Pro site own database (overrides DB_NAME from Sunbox root .env)',
                    'DB_NAME=' . $dbName,
                    '',
                    'ADMIN_PASSWORD_HASH=' . $passwordHash,
                    '',
                    'COMPANY_NAME=' . $companyName,
                    'LOGO_URL=' . $logoUrlAbs,
                    'VAT_RATE=15',
                ];
                if (file_put_contents($siteDir . '/.env', implode("\n", $envLines) . "\n") === false) {
                    $result['errors'][] = 'Avertissement: impossible d\'écrire .env';
                } else {
                    $result['debug'][] = '.env écrit.';
                }

                // Verify Sunbox root .env is reachable from the pro site's api/config.php
                // (i.e., 3 levels up from siteDir/api/ == sunbox root).
                // siteDir = sunbox-root/pros/<domain>  →  dirname($siteDir, 2) = sunbox-root
                $sunboxRootDir = dirname($siteDir, 2);
                $sunboxEnvPath = $sunboxRootDir . '/.env';
                if (is_file($sunboxEnvPath) && is_readable($sunboxEnvPath)) {
                    $result['debug'][] = 'Sunbox root .env accessible depuis le site pro (' . $sunboxEnvPath . ').';
                } else {
                    $result['errors'][] = 'Avertissement: Sunbox root .env introuvable à ' . $sunboxEnvPath
                        . '. Vérifiez que le site pro est bien sous sunbox-root/pros/<domaine>/.';
                }

                // Write .deploy_version — used by check_pro_versions to detect outdated files
                if (file_put_contents($siteDir . '/.deploy_version', PRO_FILE_VERSION) === false) {
                    $result['errors'][] = 'Avertissement: impossible d\'écrire .deploy_version';
                } else {
                    $result['debug'][] = '.deploy_version: ' . PRO_FILE_VERSION;
                }

                $result['deployed'] = true;
            } catch (Throwable $e) {
                $result['errors'][] = $e->getMessage();
            }
            ok($result);
            break;
        }

        // ── Initialize schema in an already-created pro database ───────────────
        case 'init_pro_db': {
            validateRequired($body, ['user_id']);
            $userId = (int)$body['user_id'];

            $stmt = $db->prepare("
                SELECT pp.company_name, pp.db_name
                FROM professional_profiles pp WHERE pp.user_id = ?
            ");
            $stmt->execute([$userId]);
            $profile = $stmt->fetch();
            if (!$profile) fail('Utilisateur professionnel introuvable.');

            $companyName = (string)$profile['company_name'];
            $dbName      = (string)($profile['db_name'] ?? '');

            if (!$dbName) {
                fail('Nom de la base de données manquant. Renseignez-le dans le formulaire puis enregistrez.');
            }

            $result = [
                'db_name'            => $dbName,
                'schema_initialized' => false,
                'errors'             => [],
            ];

            try {
                // Connect using Sunbox's own server credentials with the pro database name
                $proPdo = new PDO(
                    "mysql:host=" . DB_HOST . ";dbname={$dbName};charset=utf8mb4",
                    DB_USER, DB_PASS,
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
                );

                // Helper: safely add a missing column without touching existing data.
                // $table: table name, $col: column name, $def: SQL column definition
                $addCol = function(string $table, string $col, string $def) use ($proPdo): void {
                    $s = $proPdo->prepare(
                        "SELECT COUNT(*) FROM information_schema.COLUMNS
                         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
                    );
                    $s->execute([$table, $col]);
                    if (!(bool)$s->fetchColumn()) {
                        $proPdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$col}` {$def}");
                    }
                };

                // ── Core tables (CREATE IF NOT EXISTS = safe on existing DB) ──────
                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_settings` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `setting_key` VARCHAR(100) NOT NULL,
                    `setting_value` TEXT,
                    `setting_group` VARCHAR(50) DEFAULT 'general',
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY `uq_setting_key` (`setting_key`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_contacts` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `name` VARCHAR(255) NOT NULL,
                    `email` VARCHAR(255) DEFAULT '',
                    `phone` VARCHAR(50) DEFAULT '',
                    `address` TEXT,
                    `company` VARCHAR(255) DEFAULT '',
                    `device_id` VARCHAR(255) DEFAULT NULL,
                    `notes` TEXT,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                // Safe column additions for contacts (upgrade path)
                $addCol('pro_contacts', 'company',   "VARCHAR(255) DEFAULT '' AFTER `address`");
                $addCol('pro_contacts', 'device_id', "VARCHAR(255) DEFAULT NULL AFTER `company`");
                $addCol('pro_contacts', 'notes',     "TEXT AFTER `device_id`");

                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_quotes` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `reference_number` VARCHAR(50) NOT NULL,
                    `contact_id` INT DEFAULT NULL,
                    `customer_name` VARCHAR(255) DEFAULT '',
                    `customer_email` VARCHAR(255) DEFAULT '',
                    `customer_phone` VARCHAR(50) DEFAULT '',
                    `customer_address` TEXT,
                    `customer_message` TEXT,
                    `model_id` INT NOT NULL,
                    `model_name` VARCHAR(255) NOT NULL,
                    `model_type` VARCHAR(20) DEFAULT 'container',
                    `base_price` DECIMAL(12,2) DEFAULT 0,
                    `options_total` DECIMAL(12,2) DEFAULT 0,
                    `total_price` DECIMAL(12,2) NOT NULL,
                    `notes` TEXT,
                    `status` ENUM('pending','approved','rejected','completed') DEFAULT 'pending',
                    `valid_until` DATE DEFAULT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                // Safe column additions for quotes (upgrade path)
                $addCol('pro_quotes', 'customer_address', "TEXT AFTER `customer_phone`");
                $addCol('pro_quotes', 'customer_message', "TEXT AFTER `customer_address`");
                $addCol('pro_quotes', 'model_type',       "VARCHAR(20) DEFAULT 'container' AFTER `model_name`");
                $addCol('pro_quotes', 'notes',            "TEXT AFTER `total_price`");
                $addCol('pro_quotes', 'valid_until',      "DATE DEFAULT NULL AFTER `status`");
                $addCol('pro_quotes', 'boq_requested',    "TINYINT(1) DEFAULT 0 AFTER `valid_until`");
                // ── v1.7.0 ── Pool dimension columns for pro_quotes ────────────
                $addCol('pro_quotes', 'pool_shape',         "VARCHAR(20) DEFAULT NULL AFTER `boq_requested`");
                $addCol('pro_quotes', 'pool_longueur',      "DECIMAL(8,2) DEFAULT NULL AFTER `pool_shape`");
                $addCol('pro_quotes', 'pool_largeur',       "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur`");
                $addCol('pro_quotes', 'pool_profondeur',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur`");
                $addCol('pro_quotes', 'pool_longueur_la',   "DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur`");
                $addCol('pro_quotes', 'pool_largeur_la',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_la`");
                $addCol('pro_quotes', 'pool_profondeur_la', "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_la`");
                $addCol('pro_quotes', 'pool_longueur_lb',   "DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur_la`");
                $addCol('pro_quotes', 'pool_largeur_lb',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_lb`");
                $addCol('pro_quotes', 'pool_profondeur_lb', "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_lb`");
                $addCol('pro_quotes', 'pool_longueur_ta',   "DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur_lb`");
                $addCol('pro_quotes', 'pool_largeur_ta',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_ta`");
                $addCol('pro_quotes', 'pool_profondeur_ta', "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_ta`");
                $addCol('pro_quotes', 'pool_longueur_tb',   "DECIMAL(8,2) DEFAULT NULL AFTER `pool_profondeur_ta`");
                $addCol('pro_quotes', 'pool_largeur_tb',    "DECIMAL(8,2) DEFAULT NULL AFTER `pool_longueur_tb`");
                $addCol('pro_quotes', 'pool_profondeur_tb', "DECIMAL(8,2) DEFAULT NULL AFTER `pool_largeur_tb`");

                // ── Modular dimension columns (v1.9.0 / PRO_FILE_VERSION 2.9.4) ─
                $addCol('pro_quotes', 'modular_longueur',  "DECIMAL(8,2) DEFAULT NULL");
                $addCol('pro_quotes', 'modular_largeur',   "DECIMAL(8,2) DEFAULT NULL");
                $addCol('pro_quotes', 'modular_nb_etages', "INT          DEFAULT NULL");

                // ── Quote options (v1.4.0) ─────────────────────────────────────
                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_quote_options` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `quote_id` INT NOT NULL,
                    `option_id` INT DEFAULT NULL,
                    `option_name` VARCHAR(500) NOT NULL,
                    `option_price` DECIMAL(12,2) DEFAULT 0,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (`quote_id`) REFERENCES `pro_quotes`(`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                // ── Purchase Reports (v1.5.0) ──────────────────────────────────
                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_purchase_reports` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `quote_id` INT NOT NULL,
                    `quote_reference` VARCHAR(50) DEFAULT '',
                    `model_name` VARCHAR(255) DEFAULT '',
                    `status` ENUM('in_progress','completed') DEFAULT 'in_progress',
                    `total_amount` DECIMAL(12,2) DEFAULT 0,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (`quote_id`) REFERENCES `pro_quotes`(`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_purchase_report_items` (
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
                    FOREIGN KEY (`report_id`) REFERENCES `pro_purchase_reports`(`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                // Add is_option to pro_purchase_report_items if missing (upgrade)
                $addCol('pro_purchase_report_items', 'is_option', "TINYINT(1) DEFAULT 0 AFTER `is_ordered`");

                // ── v1.8.0 ── Expand pro_quotes.status ENUM + add approval_token ──
                $addCol('pro_quotes', 'approval_token', "VARCHAR(64) DEFAULT NULL AFTER `status`");
                $proEnumStmt = $proPdo->prepare(
                    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pro_quotes' AND COLUMN_NAME = 'status'"
                );
                $proEnumStmt->execute();
                $proEnumType = (string)($proEnumStmt->fetchColumn() ?? '');
                if (strpos($proEnumType, "'open'") === false) {
                    $proPdo->exec("ALTER TABLE `pro_quotes` MODIFY COLUMN `status`
                        ENUM('draft','open','validated','cancelled','pending','approved','rejected','completed')
                        NOT NULL DEFAULT 'open'");
                    $messages[] = "Colonne modifiée : pro_quotes.status (ENUM étendu avec 'open','validated')";
                }

                // ── New tables (v1.2.0) ────────────────────────────────────────
                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_discounts` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `name` VARCHAR(255) NOT NULL,
                    `description` TEXT,
                    `discount_type` ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
                    `discount_value` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `apply_to` ENUM('base_price','options','both') NOT NULL DEFAULT 'both',
                    `start_date` DATE NOT NULL,
                    `end_date` DATE NOT NULL,
                    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                    `model_ids` JSON DEFAULT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_email_templates` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `template_key` VARCHAR(100) NOT NULL,
                    `template_type` ENUM('quote','notification','password_reset','contact','status_change','other') NOT NULL DEFAULT 'other',
                    `name` VARCHAR(255) NOT NULL,
                    `subject` VARCHAR(500) NOT NULL,
                    `body_html` LONGTEXT NOT NULL,
                    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY `uq_template_key` (`template_key`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_email_signatures` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `signature_key` VARCHAR(100) NOT NULL,
                    `name` VARCHAR(255) NOT NULL,
                    `description` TEXT,
                    `body_html` LONGTEXT NOT NULL,
                    `logo_url` VARCHAR(500) DEFAULT '',
                    `photo_url` VARCHAR(500) DEFAULT '',
                    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY `uq_signature_key` (`signature_key`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                // ── Schema version table ───────────────────────────────────────
                $proPdo->exec("CREATE TABLE IF NOT EXISTS `pro_schema_version` (
                    `id`         INT NOT NULL DEFAULT 1,
                    `version`    VARCHAR(20) NOT NULL,
                    `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                $proPdo->prepare(
                    "INSERT INTO `pro_schema_version` (`id`, `version`) VALUES (1, ?)
                     ON DUPLICATE KEY UPDATE `version` = VALUES(`version`), `applied_at` = NOW()"
                )->execute([PRO_DB_SCHEMA_VERSION]);

                // ── Default settings (safe: ON DUPLICATE KEY UPDATE) ──────────
                $ins = $proPdo->prepare("
                    INSERT INTO `pro_settings` (`setting_key`, `setting_value`, `setting_group`)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)
                ");
                foreach ([
                    ['vat_rate',              '15',              'general'],
                    ['site_under_construction','false',           'site'],
                    ['company_name',           $companyName,      'company'],
                    ['company_address',        '',                'company'],
                    ['company_phone',          '',                'company'],
                    ['company_email',          '',                'company'],
                    ['vat_number',             '',                'company'],
                    ['brn_number',             '',                'company'],
                ] as $row) {
                    $ins->execute($row);
                }

                $result['schema_initialized'] = true;
                $result['schema_version']      = PRO_DB_SCHEMA_VERSION;
            } catch (Throwable $e) {
                $result['errors'][] = $e->getMessage();
            }

            ok($result);
            break;
        }

        case 'get_pro_model_overrides': {
            validateRequired($body, ['user_id']);
            $stmt = $db->prepare("SELECT * FROM pro_model_overrides WHERE user_id = ?");
            $stmt->execute([(int)$body['user_id']]);
            ok($stmt->fetchAll());
            break;
        }

        case 'set_pro_model_override': {
            validateRequired($body, ['user_id', 'model_id']);
            $uid = (int)$body['user_id'];
            $mid = (int)$body['model_id'];
            $adj = isset($body['price_adjustment']) ? (float)$body['price_adjustment'] : 0;
            $enabled = isset($body['is_enabled']) ? (int)(bool)$body['is_enabled'] : 1;
            $db->prepare("
                INSERT INTO pro_model_overrides (user_id, model_id, price_adjustment, is_enabled)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE price_adjustment = ?, is_enabled = ?, updated_at = NOW()
            ")->execute([$uid, $mid, $adj, $enabled, $adj, $enabled]);
            ok();
            break;
        }

        case 'set_pro_model_enabled': {
            // Updates is_enabled only; price_adjustment is 0 for new rows,
            // preserved unchanged for existing rows (ON DUPLICATE KEY only updates is_enabled).
            validateRequired($body, ['user_id', 'model_id']);
            $uid     = (int)$body['user_id'];
            $mid     = (int)$body['model_id'];
            $enabled = isset($body['is_enabled']) ? (int)(bool)$body['is_enabled'] : 1;
            $db->prepare("
                INSERT INTO pro_model_overrides (user_id, model_id, price_adjustment, is_enabled)
                VALUES (?, ?, 0, ?)
                ON DUPLICATE KEY UPDATE is_enabled = ?, updated_at = NOW()
            ")->execute([$uid, $mid, $enabled, $enabled]);
            ok();
            break;
        }

        case 'delete_pro_user': {
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM users WHERE id = ? AND role = 'professional'")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // =====================================================================
        // SEMI-PROFESSIONAL USERS (admin management)
        // =====================================================================

        case 'get_semi_pro_users': {
            $stmt = $db->query("
                SELECT u.id, u.name, u.email, u.role,
                       pp.company_name, pp.address, pp.vat_number, pp.brn_number,
                       pp.phone, pp.logo_url, pp.is_active,
                       COALESCE(pp.model_request_cost, 5000) AS model_request_cost,
                       pp.allowed_model_type_slugs
                FROM users u
                LEFT JOIN professional_profiles pp ON pp.user_id = u.id
                WHERE u.role = 'semi_professional'
                ORDER BY u.name ASC
            ");
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['allowed_model_type_slugs'] = !empty($r['allowed_model_type_slugs'])
                    ? json_decode($r['allowed_model_type_slugs'], true)
                    : null;
            }
            unset($r);
            ok($rows);
            break;
        }

        case 'create_semi_pro_user': {
            validateRequired($body, ['name', 'email', 'password', 'company_name']);
            $passwordHash = password_hash((string)$body['password'], PASSWORD_BCRYPT);
            $apiToken     = bin2hex(random_bytes(32));

            $db->beginTransaction();
            try {
                $stmt = $db->prepare("
                    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'semi_professional')
                ");
                $stmt->execute([$body['name'], strtolower(trim($body['email'])), $passwordHash]);
                $userId = (int)$db->lastInsertId();

                $stmt = $db->prepare("
                    INSERT INTO professional_profiles
                        (user_id, company_name, address, vat_number, brn_number, phone, api_token, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                ");
                $stmt->execute([
                    $userId,
                    $body['company_name'],
                    $body['address'] ?? '',
                    $body['vat_number'] ?? '',
                    $body['brn_number'] ?? '',
                    $body['phone'] ?? '',
                    $apiToken,
                ]);
                $db->commit();
                ok(['id' => $userId, 'api_token' => $apiToken]);
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'update_semi_pro_user': {
            validateRequired($body, ['id']);
            $id = (int)$body['id'];

            $userSets = [];
            $userParams = [];
            if (array_key_exists('name', $body))     { $userSets[] = 'name = ?';          $userParams[] = $body['name']; }
            if (array_key_exists('email', $body))    { $userSets[] = 'email = ?';         $userParams[] = strtolower(trim($body['email'])); }
            if (!empty($body['password']))            { $userSets[] = 'password_hash = ?'; $userParams[] = password_hash((string)$body['password'], PASSWORD_BCRYPT); }
            if (!empty($userSets)) {
                $userParams[] = $id;
                $db->prepare("UPDATE users SET " . implode(', ', $userSets) . " WHERE id = ? AND role = 'semi_professional'")->execute($userParams);
            }

            $profSets = [];
            $profParams = [];
            if (array_key_exists('company_name', $body)) { $profSets[] = 'company_name = ?'; $profParams[] = $body['company_name']; }
            if (array_key_exists('address', $body))      { $profSets[] = 'address = ?';      $profParams[] = $body['address']; }
            if (array_key_exists('vat_number', $body))   { $profSets[] = 'vat_number = ?';   $profParams[] = $body['vat_number']; }
            if (array_key_exists('brn_number', $body))   { $profSets[] = 'brn_number = ?';   $profParams[] = $body['brn_number']; }
            if (array_key_exists('phone', $body))        { $profSets[] = 'phone = ?';        $profParams[] = $body['phone']; }
            if (array_key_exists('logo_url', $body))     { $profSets[] = 'logo_url = ?';     $profParams[] = $body['logo_url']; }
            if (array_key_exists('is_active', $body))    { $profSets[] = 'is_active = ?';    $profParams[] = (int)(bool)$body['is_active']; }
            if (array_key_exists('allowed_model_type_slugs', $body)) {
                $slugs = $body['allowed_model_type_slugs'];
                $profSets[]   = 'allowed_model_type_slugs = ?';
                $profParams[] = ($slugs === null) ? null : json_encode(array_values(array_filter((array)$slugs)));
            }
            if (!empty($profSets)) {
                $profSets[] = 'updated_at = NOW()';
                $profParams[] = $id;
                $db->prepare("UPDATE professional_profiles SET " . implode(', ', $profSets) . " WHERE user_id = ?")->execute($profParams);
            }
            ok();
            break;
        }

        case 'delete_semi_pro_user': {
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM users WHERE id = ? AND role = 'semi_professional'")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ── Deploy shared semi-pro site to /pros/<slug>/ ──────────────────────
        case 'deploy_semi_pro_site': {
            requireAdmin();
            validateRequired($body, ['slug', 'company_name', 'db_name']);
            $slug        = preg_replace('/[^a-z0-9._-]/i', '_', strtolower((string)$body['slug']));
            $companyName = (string)$body['company_name'];
            $dbName      = (string)$body['db_name'];
            $logoUrl     = (string)($body['logo_url']     ?? '');
            $domain      = (string)($body['domain']       ?? '');
            $loginBgUrl  = (string)($body['login_bg_url'] ?? '');

            if (!$slug) fail('Slug invalide.');

            $sunboxBaseUrl = rtrim((string)env('APP_URL', 'https://sunbox-mauritius.com'), '/');
            $siteUrl       = $sunboxBaseUrl . '/pros/' . $slug;
            $siteDir       = proSiteDir($slug);

            $result = [
                'deployed' => false,
                'site_dir' => $siteDir,
                'site_url' => $siteUrl,
                'errors'   => [],
                'debug'    => [],
            ];

            try {
                foreach ([$siteDir, $siteDir . '/api'] as $dir) {
                    if (!is_dir($dir)) {
                        if (!mkdir($dir, 0755, true)) {
                            throw new \Exception("mkdir échoué pour: $dir — vérifiez les permissions.");
                        }
                    }
                }
                $result['debug'][] = 'Répertoires créés.';

                $templateDir = __DIR__ . '/semi_pro_deploy';
                if (!is_dir($templateDir)) {
                    throw new \Exception("Dossier templates semi-pro introuvable: $templateDir");
                }

                $replacements = [
                    '{{SLUG}}'         => $slug,
                    '{{COMPANY_NAME}}' => $companyName,
                    '{{DB_NAME}}'      => $dbName,
                ];

                $filesToDeploy = [
                    'api_config.php'          => $siteDir . '/api/config.php',
                    'api_index.php'           => $siteDir . '/api/index.php',
                    'api_semi_pro_auth.php'   => $siteDir . '/api/pro_auth.php',
                    'api_htaccess'            => $siteDir . '/api/.htaccess',
                    'htaccess'                => $siteDir . '/.htaccess',
                    'index.php'               => $siteDir . '/index.php',
                ];
                foreach ($filesToDeploy as $tpl => $dest) {
                    $tplPath = $templateDir . '/' . $tpl;
                    if (!file_exists($tplPath)) {
                        throw new \Exception("Template introuvable: $tplPath");
                    }
                    $content = file_get_contents($tplPath);
                    if ($content === false) throw new \Exception("Lecture échouée: $tplPath");
                    $content = str_replace(array_keys($replacements), array_values($replacements), $content);
                    if (file_put_contents($dest, $content) === false) {
                        throw new \Exception("Écriture échouée: $dest — vérifiez les permissions.");
                    }
                }
                $result['debug'][] = 'Fichiers PHP déployés.';

                // Symlink assets
                $mainAssetsDir = dirname(__DIR__) . '/assets';
                $proAssetsLink = $siteDir . '/assets';
                if (!file_exists($proAssetsLink) && !is_link($proAssetsLink)) {
                    if (is_dir($mainAssetsDir)) {
                        if (!symlink($mainAssetsDir, $proAssetsLink)) {
                            $result['errors'][] = 'Avertissement: symlink assets échoué. Créez-le manuellement: ln -s {sunbox_root}/assets ' . $proAssetsLink;
                        } else {
                            $result['debug'][] = 'Symlink assets créé.';
                        }
                    }
                } else {
                    $result['debug'][] = 'Symlink/dossier assets déjà présent.';
                }

                // Copy fallback index.html
                $mainIndexPath = dirname(__DIR__) . '/index.html';
                if (file_exists($mainIndexPath)) {
                    $indexHtml = file_get_contents($mainIndexPath);
                    if ($indexHtml !== false) {
                        $siteApiUrl = $siteUrl . '/api';
                        $proConfig  = '<script>'
                            . 'window.__SEMI_PRO_SITE__=true;'
                            . 'window.__PRO_SITE__=false;'
                            . 'window.__API_BASE_URL__='     . json_encode($siteApiUrl,   JSON_HEX_TAG | JSON_HEX_AMP) . ';'
                            . 'window.__PRO_COMPANY_NAME__=' . json_encode($companyName,  JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
                            . 'window.__PRO_LOGO_URL__='     . json_encode($logoUrl,      JSON_HEX_TAG | JSON_HEX_AMP) . ';'
                            . 'window.__PRO_LOGIN_BG__='     . json_encode($loginBgUrl,   JSON_HEX_TAG | JSON_HEX_AMP) . ';'
                            . 'window.__PRO_THEME__=null;'
                            . 'window.__PRO_HEADER_IMAGES__=[];'
                            . '</script>';
                        $closeHeadPos = stripos($indexHtml, '</head>');
                        if ($closeHeadPos !== false) {
                            $indexHtml = substr($indexHtml, 0, $closeHeadPos) . $proConfig . substr($indexHtml, $closeHeadPos);
                        } else {
                            $indexHtml .= $proConfig;
                        }
                        file_put_contents($siteDir . '/index.html', $indexHtml);
                        $result['debug'][] = 'index.html (fallback) déployé.';
                    }
                }

                // Write .env
                $envLines = [
                    '# Semi-Pro site config — DB credentials come from Sunbox root .env automatically.',
                    'APP_URL=' . $siteUrl,
                    'DB_NAME=' . $dbName,
                    'COMPANY_NAME=' . $companyName,
                    'LOGO_URL=' . $logoUrl,
                    'DOMAIN=' . $domain,
                    'LOGIN_BG_URL=' . $loginBgUrl,
                    'VAT_RATE=15',
                    'API_DEBUG=false',
                ];
                if (file_put_contents($siteDir . '/.env', implode("\n", $envLines) . "\n") === false) {
                    $result['errors'][] = 'Avertissement: impossible d\'écrire .env';
                } else {
                    $result['debug'][] = '.env écrit.';
                }

                // Write .deploy_version
                file_put_contents($siteDir . '/.deploy_version', SEMI_PRO_FILE_VERSION);
                $result['debug'][] = '.deploy_version: ' . SEMI_PRO_FILE_VERSION;

                $result['deployed'] = true;
            } catch (Throwable $e) {
                $result['errors'][] = $e->getMessage();
            }
            ok($result);
            break;
        }

        // ── Check semi-pro site deployment status ─────────────────────────────
        case 'get_semi_pro_site_version': {
            requireAdmin();
            validateRequired($body, ['slug']);
            $slug    = preg_replace('/[^a-z0-9._-]/i', '_', strtolower((string)$body['slug']));
            $siteDir = proSiteDir($slug);

            $result = [
                'slug'             => $slug,
                'site_dir'         => $siteDir,
                'deployed'         => is_dir($siteDir),
                'files_up_to_date' => false,
                'latest_version'   => SEMI_PRO_FILE_VERSION,
                'current_version'  => null,
            ];
            $versionFile = $siteDir . '/.deploy_version';
            if (is_file($versionFile)) {
                $ver = trim((string)file_get_contents($versionFile));
                $result['current_version']  = $ver;
                $result['files_up_to_date'] = version_compare($ver, SEMI_PRO_FILE_VERSION, '>=');
            }
            ok($result);
            break;
        }

        // ── Initialize semi-pro shared database schema ────────────────────────
        case 'init_semi_pro_db': {
            requireAdmin();
            validateRequired($body, ['db_name']);
            $dbName = (string)$body['db_name'];
            $result = ['initialized' => false, 'errors' => [], 'debug' => []];
            try {
                $semiProPdo = new PDO(
                    "mysql:host=" . DB_HOST . ";dbname={$dbName};charset=utf8mb4",
                    DB_USER, DB_PASS,
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
                );

                // Run schema from SQL file
                $schemaFile = __DIR__ . '/semi_pro_deploy/semi_pro_site_schema.sql';
                if (!file_exists($schemaFile)) {
                    throw new \Exception("Schema SQL introuvable: $schemaFile");
                }
                $sql = file_get_contents($schemaFile);
                if ($sql === false) throw new \Exception("Lecture du schema SQL échouée.");

                // Execute statement by statement.
                // Strip single-line SQL comments (-- ...) from each block before checking
                // whether it is empty, so that CREATE TABLE statements preceded by section
                // comments (e.g. "-- ── Purchase reports ───") are not accidentally dropped.
                $stmts = array_filter(
                    array_map(function (string $s): string {
                        return trim(preg_replace('/^--[^\n]*\n?/m', '', $s) ?? $s);
                    }, preg_split('/;\s*$/m', $sql) ?: []),
                    fn($s) => $s !== ''
                );
                foreach ($stmts as $stmt) {
                    if (trim($stmt) === '') continue;
                    $semiProPdo->exec($stmt);
                }
                $result['initialized'] = true;
                $result['debug'][]     = 'Schéma semi-pro initialisé dans: ' . $dbName;
            } catch (Throwable $e) {
                $result['errors'][] = $e->getMessage();
            }
            ok($result);
            break;
        }

        // ── Read deployed semi-pro site configuration from .env ───────────────
        case 'get_semi_pro_site_config': {
            requireAdmin();
            $slug    = preg_replace('/[^a-z0-9._-]/i', '_', strtolower((string)($body['slug'] ?? 'semi-pro')));
            $siteDir = proSiteDir($slug);

            $config = [
                'deployed'         => is_dir($siteDir),
                'slug'             => $slug,
                'db_name'          => '',
                'company_name'     => '',
                'logo_url'         => '',
                'domain'           => '',
                'login_bg_url'     => '',
                'current_version'  => null,
                'latest_version'   => SEMI_PRO_FILE_VERSION,
                'files_up_to_date' => false,
            ];

            // Read .env for persisted config values
            $envFile = $siteDir . '/.env';
            if (is_file($envFile)) {
                $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || str_starts_with($line, '#') || strpos($line, '=') === false) continue;
                    [$k, $v] = explode('=', $line, 2);
                    switch (trim($k)) {
                        case 'DB_NAME':      $config['db_name']      = trim($v); break;
                        case 'COMPANY_NAME': $config['company_name'] = trim($v); break;
                        case 'LOGO_URL':     $config['logo_url']     = trim($v); break;
                        case 'DOMAIN':       $config['domain']       = trim($v); break;
                        case 'LOGIN_BG_URL': $config['login_bg_url'] = trim($v); break;
                    }
                }
            }

            // Read deploy version
            $versionFile = $siteDir . '/.deploy_version';
            if (is_file($versionFile)) {
                $ver = trim((string)file_get_contents($versionFile));
                $config['current_version']  = $ver;
                $config['files_up_to_date'] = version_compare($ver, SEMI_PRO_FILE_VERSION, '>=');
            }

            // Read semi-pro DB schema version (non-fatal)
            $config['current_db_version']  = null;
            $config['latest_db_version']   = SEMI_PRO_DB_SCHEMA_VERSION;
            $config['db_up_to_date']       = false;
            if (!empty($config['db_name'])) {
                try {
                    $spPdo = new PDO(
                        "mysql:host=" . DB_HOST . ";dbname=" . $config['db_name'] . ";charset=utf8mb4",
                        DB_USER, DB_PASS,
                        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
                    );
                    $row = $spPdo->query("SELECT `version` FROM `semi_pro_schema_version` WHERE `id` = 1 LIMIT 1")->fetch();
                    if ($row) {
                        $config['current_db_version'] = $row['version'];
                        $config['db_up_to_date']      = version_compare($row['version'], SEMI_PRO_DB_SCHEMA_VERSION, '>=');
                    }
                } catch (\Throwable $ignored) {}
            }

            ok($config);
            break;
        }

        // ── Save semi-pro site branding config to .env (no file re-deploy) ────
        case 'save_semi_pro_config': {
            requireAdmin();
            validateRequired($body, ['slug']);
            $slug        = preg_replace('/[^a-z0-9._-]/i', '_', strtolower((string)$body['slug']));
            $siteDir     = proSiteDir($slug);
            if (!is_dir($siteDir)) fail('Site non déployé.');

            $envFile = $siteDir . '/.env';
            $envVars = [];
            // Read existing .env first
            if (is_file($envFile)) {
                foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
                    $line = trim($line);
                    if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
                    [$k, $v] = explode('=', $line, 2);
                    $envVars[trim($k)] = trim($v);
                }
            }
            // Overwrite only the branding fields passed in the request
            if (array_key_exists('company_name', $body)) $envVars['COMPANY_NAME'] = (string)$body['company_name'];
            if (array_key_exists('logo_url',     $body)) $envVars['LOGO_URL']     = (string)$body['logo_url'];
            if (array_key_exists('domain',       $body)) $envVars['DOMAIN']       = (string)$body['domain'];
            if (array_key_exists('login_bg_url', $body)) $envVars['LOGIN_BG_URL'] = (string)$body['login_bg_url'];

            $lines = [];
            foreach ($envVars as $k => $v) $lines[] = "$k=$v";
            if (file_put_contents($envFile, implode("\n", $lines) . "\n") === false) {
                fail('Impossible d\'écrire le fichier .env.');
            }
            ok(['saved' => true]);
            break;
        }

        // ── Update semi-pro site files (re-deploy PHP templates) ─────────────
        case 'update_semi_pro_site': {
            requireAdmin();
            validateRequired($body, ['slug', 'company_name', 'db_name']);
            $slug        = preg_replace('/[^a-z0-9._-]/i', '_', strtolower((string)$body['slug']));
            $companyName = (string)$body['company_name'];
            $dbName      = (string)$body['db_name'];
            $logoUrl     = (string)($body['logo_url']     ?? '');
            $domain      = (string)($body['domain']       ?? '');
            $loginBgUrl  = (string)($body['login_bg_url'] ?? '');

            if (!$slug) fail('Slug invalide.');

            $sunboxBaseUrl = rtrim((string)env('APP_URL', 'https://sunbox-mauritius.com'), '/');
            $siteUrl       = $sunboxBaseUrl . '/pros/' . $slug;
            $siteDir       = proSiteDir($slug);

            if (!is_dir($siteDir)) fail('Site non déployé. Utilisez "Déployer le site" d\'abord.');

            $result = ['updated' => false, 'errors' => [], 'debug' => []];
            try {
                // Ensure api subdirectory exists
                if (!is_dir($siteDir . '/api')) {
                    mkdir($siteDir . '/api', 0755, true);
                }

                $templateDir = __DIR__ . '/semi_pro_deploy';
                $replacements = [
                    '{{SLUG}}'         => $slug,
                    '{{COMPANY_NAME}}' => $companyName,
                    '{{DB_NAME}}'      => $dbName,
                ];
                $filesToDeploy = [
                    'api_config.php'          => $siteDir . '/api/config.php',
                    'api_index.php'           => $siteDir . '/api/index.php',
                    'api_semi_pro_auth.php'   => $siteDir . '/api/pro_auth.php',
                    'api_htaccess'            => $siteDir . '/api/.htaccess',
                    'htaccess'                => $siteDir . '/.htaccess',
                    'index.php'               => $siteDir . '/index.php',
                ];
                foreach ($filesToDeploy as $tpl => $dest) {
                    $tplPath = $templateDir . '/' . $tpl;
                    if (!file_exists($tplPath)) throw new \Exception("Template introuvable: $tplPath");
                    $content = file_get_contents($tplPath);
                    if ($content === false) throw new \Exception("Lecture échouée: $tplPath");
                    $content = str_replace(array_keys($replacements), array_values($replacements), $content);
                    if (file_put_contents($dest, $content) === false) throw new \Exception("Écriture échouée: $dest");
                }
                $result['debug'][] = 'Fichiers PHP mis à jour.';

                // Re-inject index.html with updated config
                $mainIndexPath = dirname(__DIR__) . '/index.html';
                if (file_exists($mainIndexPath)) {
                    $indexHtml = file_get_contents($mainIndexPath);
                    if ($indexHtml !== false) {
                        $siteApiUrl = $siteUrl . '/api';
                        $proConfig  = '<script>'
                            . 'window.__SEMI_PRO_SITE__=true;'
                            . 'window.__PRO_SITE__=false;'
                            . 'window.__API_BASE_URL__='     . json_encode($siteApiUrl,   JSON_HEX_TAG | JSON_HEX_AMP) . ';'
                            . 'window.__PRO_COMPANY_NAME__=' . json_encode($companyName,  JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
                            . 'window.__PRO_LOGO_URL__='     . json_encode($logoUrl,      JSON_HEX_TAG | JSON_HEX_AMP) . ';'
                            . 'window.__PRO_LOGIN_BG__='     . json_encode($loginBgUrl,   JSON_HEX_TAG | JSON_HEX_AMP) . ';'
                            . 'window.__PRO_THEME__=null;'
                            . 'window.__PRO_HEADER_IMAGES__=[];'
                            . '</script>';
                        $closeHeadPos = stripos($indexHtml, '</head>');
                        if ($closeHeadPos !== false) {
                            $indexHtml = substr($indexHtml, 0, $closeHeadPos) . $proConfig . substr($indexHtml, $closeHeadPos);
                        } else {
                            $indexHtml .= $proConfig;
                        }
                        file_put_contents($siteDir . '/index.html', $indexHtml);
                        $result['debug'][] = 'index.html mis à jour.';
                    }
                }

                // Update .env
                $envLines = [
                    '# Semi-Pro site config — DB credentials come from Sunbox root .env automatically.',
                    'APP_URL=' . $siteUrl,
                    'DB_NAME=' . $dbName,
                    'COMPANY_NAME=' . $companyName,
                    'LOGO_URL=' . $logoUrl,
                    'DOMAIN=' . $domain,
                    'LOGIN_BG_URL=' . $loginBgUrl,
                    'VAT_RATE=15',
                    'API_DEBUG=false',
                ];
                file_put_contents($siteDir . '/.env', implode("\n", $envLines) . "\n");

                // Update .deploy_version
                file_put_contents($siteDir . '/.deploy_version', SEMI_PRO_FILE_VERSION);
                $result['debug'][] = '.deploy_version: ' . SEMI_PRO_FILE_VERSION;

                $result['updated'] = true;
            } catch (Throwable $e) {
                $result['errors'][] = $e->getMessage();
            }
            ok($result);
            break;
        }

        // ── Update semi-pro shared database schema ────────────────────────────
        case 'update_semi_pro_db': {
            requireAdmin();
            validateRequired($body, ['db_name']);
            $dbName = (string)$body['db_name'];
            $result = ['updated' => false, 'errors' => [], 'debug' => []];
            try {
                $semiProPdo = new PDO(
                    "mysql:host=" . DB_HOST . ";dbname={$dbName};charset=utf8mb4",
                    DB_USER, DB_PASS,
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
                );

                $schemaFile = __DIR__ . '/semi_pro_deploy/semi_pro_site_schema.sql';
                if (!file_exists($schemaFile)) throw new \Exception("Schema SQL introuvable: $schemaFile");
                $sql = file_get_contents($schemaFile);
                if ($sql === false) throw new \Exception("Lecture du schema SQL échouée.");

                $stmts = array_filter(
                    array_map(function (string $s): string {
                        return trim(preg_replace('/^--[^\n]*\n?/m', '', $s) ?? $s);
                    }, preg_split('/;\s*$/m', $sql) ?: []),
                    fn($s) => $s !== ''
                );
                foreach ($stmts as $stmt) {
                    if (trim($stmt) === '') continue;
                    $semiProPdo->exec($stmt);
                }
                $result['updated'] = true;
                $result['debug'][] = 'Schéma semi-pro mis à jour dans: ' . $dbName;
            } catch (Throwable $e) {
                $result['errors'][] = $e->getMessage();
            }
            ok($result);
            break;
        }

        case 'get_pro_profile': {
            startSession();
            $userId = (int)($_SESSION['pro_user_id'] ?? $body['user_id'] ?? 0);
            if (!$userId) { fail('Non authentifié', 401); }
            $stmt = $db->prepare("
                SELECT u.id, u.name, u.email,
                       pp.company_name, pp.address, pp.vat_number, pp.brn_number,
                       pp.phone, pp.logo_url, pp.sunbox_margin_percent, pp.credits, pp.is_active
                FROM users u
                LEFT JOIN professional_profiles pp ON pp.user_id = u.id
                WHERE u.id = ?
                LIMIT 1
            ");
            $stmt->execute([$userId]);
            $profile = $stmt->fetch();
            if (!$profile) { fail('Profil introuvable', 404); }
            $profile['sunbox_margin_percent'] = (float)$profile['sunbox_margin_percent'];
            $profile['credits'] = (float)$profile['credits'];
            ok($profile);
            break;
        }

        case 'update_pro_profile': {
            startSession();
            $userId = (int)($_SESSION['pro_user_id'] ?? 0);
            if (!$userId) { fail('Non authentifié', 401); }
            $sets = [];
            $params = [];
            if (array_key_exists('company_name', $body)) { $sets[] = 'company_name = ?'; $params[] = $body['company_name']; }
            if (array_key_exists('address', $body)) { $sets[] = 'address = ?'; $params[] = $body['address']; }
            if (array_key_exists('vat_number', $body)) { $sets[] = 'vat_number = ?'; $params[] = $body['vat_number']; }
            if (array_key_exists('brn_number', $body)) { $sets[] = 'brn_number = ?'; $params[] = $body['brn_number']; }
            if (array_key_exists('phone', $body)) { $sets[] = 'phone = ?'; $params[] = $body['phone']; }
            if (array_key_exists('sunbox_margin_percent', $body)) { $sets[] = 'sunbox_margin_percent = ?'; $params[] = (float)$body['sunbox_margin_percent']; }
            if (array_key_exists('logo_url', $body)) { $sets[] = 'logo_url = ?'; $params[] = $body['logo_url']; }
            if (!empty($sets)) {
                $sets[] = 'updated_at = NOW()';
                $params[] = $userId;
                $db->prepare("UPDATE professional_profiles SET " . implode(', ', $sets) . " WHERE user_id = ?")->execute($params);
            }
            ok();
            break;
        }

        case 'buy_pro_pack': {
            validateRequired($body, ['user_id']);
            $userId = (int)$body['user_id'];
            $packAmount = 10000;
            $db->beginTransaction();
            try {
                // Add credits
                $db->prepare("UPDATE professional_profiles SET credits = credits + ?, updated_at = NOW() WHERE user_id = ?")->execute([$packAmount, $userId]);
                // Get new balance
                $balance = (float)$db->prepare("SELECT credits FROM professional_profiles WHERE user_id = ?")->execute([$userId]) ? $db->query("SELECT credits FROM professional_profiles WHERE user_id = $userId")->fetchColumn() : 0;
                $stmt = $db->prepare("SELECT credits FROM professional_profiles WHERE user_id = ?");
                $stmt->execute([$userId]);
                $balance = (float)$stmt->fetchColumn();
                // Record pack
                $db->prepare("INSERT INTO professional_packs (user_id, amount) VALUES (?, ?)")->execute([$userId, $packAmount]);
                // Record transaction
                $db->prepare("
                    INSERT INTO professional_credit_transactions (user_id, amount, reason, balance_after)
                    VALUES (?, ?, 'pack_purchase', ?)
                ")->execute([$userId, $packAmount, $balance]);
                $db->commit();
                ok(['credits' => $balance]);
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'get_pro_credits': {
            startSession();
            $userId = (int)($_SESSION['pro_user_id'] ?? $body['user_id'] ?? 0);
            if (!$userId) { fail('Non authentifié', 401); }
            $stmt = $db->prepare("SELECT credits, COALESCE(model_request_cost, 5000) AS model_request_cost FROM professional_profiles WHERE user_id = ?");
            $stmt->execute([$userId]);
            $row     = $stmt->fetch();
            $credits = (float)($row['credits'] ?? 0);
            $modelRequestCost = (float)($row['model_request_cost'] ?? 5000);

            $txStmt = $db->prepare("
                SELECT * FROM professional_credit_transactions
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 20
            ");
            $txStmt->execute([$userId]);
            $transactions = $txStmt->fetchAll();

            $mrCountStmt = $db->prepare("SELECT COUNT(*) FROM professional_model_requests WHERE user_id = ?");
            $mrCountStmt->execute([$userId]);
            $totalModelRequests = (int)$mrCountStmt->fetchColumn();

            ok(['credits' => $credits, 'model_request_cost' => $modelRequestCost, 'transactions' => $transactions, 'total_model_requests' => $totalModelRequests]);
            break;
        }

        case 'deduct_pro_credits': {
            startSession();
            $userId = (int)($_SESSION['pro_user_id'] ?? $body['user_id'] ?? 0);
            if (!$userId) { fail('Non authentifié', 401); }
            validateRequired($body, ['amount', 'reason']);
            $amount = (float)$body['amount'];
            $reason = (string)$body['reason'];
            $quoteId = isset($body['quote_id']) ? (int)$body['quote_id'] : null;

            $db->beginTransaction();
            try {
                $stmt = $db->prepare("SELECT credits FROM professional_profiles WHERE user_id = ? FOR UPDATE");
                $stmt->execute([$userId]);
                $current = (float)$stmt->fetchColumn();
                if ($current < $amount) { $db->rollBack(); fail('Crédits insuffisants', 402); }
                $newBalance = $current - $amount;
                $db->prepare("UPDATE professional_profiles SET credits = ?, updated_at = NOW() WHERE user_id = ?")->execute([$newBalance, $userId]);
                $db->prepare("
                    INSERT INTO professional_credit_transactions (user_id, amount, reason, quote_id, balance_after)
                    VALUES (?, ?, ?, ?, ?)
                ")->execute([$userId, -$amount, $reason, $quoteId, $newBalance]);
                $db->commit();
                ok(['credits' => $newBalance]);
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'get_model_requests': {
            startSession();
            if (!empty($body['user_id'])) {
                $userId = (int)$body['user_id'];
            } else {
                $userId = (int)($_SESSION['pro_user_id'] ?? 0);
            }
            if ($userId) {
                $stmt = $db->prepare("SELECT * FROM professional_model_requests WHERE user_id = ? ORDER BY created_at DESC");
                $stmt->execute([$userId]);
            } else {
                $stmt = $db->query("SELECT r.*, u.name AS user_name, pp.company_name, m.name AS linked_model_name FROM professional_model_requests r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN professional_profiles pp ON pp.user_id = r.user_id LEFT JOIN models m ON m.id = r.linked_model_id ORDER BY r.created_at DESC");
            }
            ok($stmt->fetchAll());
            break;
        }

        case 'create_model_request': {
            startSession();
            $userId = (int)($_SESSION['pro_user_id'] ?? 0);
            if (!$userId) { fail('Non authentifié', 401); }
            validateRequired($body, ['description']);
            $db->beginTransaction();
            try {
                // Fetch credits and configurable cost in one query
                $stmt = $db->prepare("SELECT credits, COALESCE(model_request_cost, 5000) AS cost FROM professional_profiles WHERE user_id = ? FOR UPDATE");
                $stmt->execute([$userId]);
                $row     = $stmt->fetch();
                $credits = (float)($row['credits'] ?? 0);
                $cost    = (float)($row['cost'] ?? 5000);
                if ($credits < $cost) { $db->rollBack(); fail('Crédits insuffisants (' . number_format($cost, 0, '.', ' ') . ' Rs requis)', 402); }
                // Deduct
                $newBalance = $credits - $cost;
                $db->prepare("UPDATE professional_profiles SET credits = ?, updated_at = NOW() WHERE user_id = ?")->execute([$newBalance, $userId]);
                // Create request
                $stmt = $db->prepare("
                    INSERT INTO professional_model_requests
                        (user_id, description, container_20ft_count, container_40ft_count, bedrooms, bathrooms, sketch_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $userId,
                    $body['description'],
                    (int)($body['container_20ft_count'] ?? 0),
                    (int)($body['container_40ft_count'] ?? 0),
                    (int)($body['bedrooms'] ?? 0),
                    (int)($body['bathrooms'] ?? 0),
                    $body['sketch_url'] ?? null,
                ]);
                $reqId = (int)$db->lastInsertId();
                // Record transaction
                $db->prepare("
                    INSERT INTO professional_credit_transactions (user_id, amount, reason, balance_after)
                    VALUES (?, ?, 'model_request', ?)
                ")->execute([$userId, -$cost, $newBalance]);
                $db->commit();
                ok(['id' => $reqId, 'credits' => $newBalance, 'cost' => $cost]);
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'update_model_request': {
            validateRequired($body, ['id']);
            $sets = [];
            $params = [];
            if (array_key_exists('status', $body)) { $sets[] = 'status = ?'; $params[] = $body['status']; }
            if (array_key_exists('admin_notes', $body)) { $sets[] = 'admin_notes = ?'; $params[] = $body['admin_notes']; }
            if (array_key_exists('linked_model_id', $body)) { $sets[] = 'linked_model_id = ?'; $params[] = $body['linked_model_id'] ? (int)$body['linked_model_id'] : null; }
            if (!empty($sets)) {
                $sets[] = 'updated_at = NOW()';
                $params[] = (int)$body['id'];
                $db->prepare("UPDATE professional_model_requests SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
            }
            ok();
            break;
        }

        // ── Pro Themes CRUD ───────────────────────────────────────────────────────

        case 'get_pro_themes': {
            $stmt = $db->query("SELECT * FROM professional_themes ORDER BY id ASC");
            ok($stmt->fetchAll());
            break;
        }

        case 'create_pro_theme': {
            requireAdmin();
            validateRequired($body, ['name']);
            $stmt = $db->prepare("
                INSERT INTO professional_themes
                    (name, logo_position, header_height, header_bg_color, header_text_color,
                     font_family, nav_position, nav_has_background, nav_bg_color,
                     nav_text_color, nav_hover_color, button_color, button_text_color,
                     footer_bg_color, footer_text_color)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $body['name'],
                $body['logo_position']      ?? 'left',
                $body['header_height']      ?? 'medium',
                $body['header_bg_color']    ?? '#FFFFFF',
                $body['header_text_color']  ?? '#1A365D',
                $body['font_family']        ?? 'Inter',
                $body['nav_position']       ?? 'right',
                (int)($body['nav_has_background'] ?? 1),
                $body['nav_bg_color']       ?? '#FFFFFF',
                $body['nav_text_color']     ?? '#1A365D',
                $body['nav_hover_color']    ?? '#F97316',
                $body['button_color']       ?? '#F97316',
                $body['button_text_color']  ?? '#FFFFFF',
                $body['footer_bg_color']    ?? '#1A365D',
                $body['footer_text_color']  ?? '#FFFFFF',
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_pro_theme': {
            requireAdmin();
            validateRequired($body, ['id']);
            $sets   = [];
            $params = [];
            $fields = ['name','logo_position','header_height','header_bg_color','header_text_color',
                       'font_family','nav_position','nav_bg_color','nav_text_color','nav_hover_color',
                       'button_color','button_text_color','footer_bg_color','footer_text_color'];
            foreach ($fields as $f) {
                if (array_key_exists($f, $body)) { $sets[] = "`{$f}` = ?"; $params[] = $body[$f]; }
            }
            if (array_key_exists('nav_has_background', $body)) {
                $sets[] = '`nav_has_background` = ?';
                $params[] = (int)(bool)$body['nav_has_background'];
            }
            if (!empty($sets)) {
                $sets[] = '`updated_at` = NOW()';
                $params[] = (int)$body['id'];
                $db->prepare("UPDATE professional_themes SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
            }
            ok();
            break;
        }

        case 'delete_pro_theme': {
            requireAdmin();
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            if ($id === 1) { fail('Le thème par défaut Sunbox ne peut pas être supprimé.', 403); }
            // Unassign from pro users before deleting
            $db->prepare("UPDATE professional_profiles SET theme_id = NULL WHERE theme_id = ?")->execute([$id]);
            $db->prepare("DELETE FROM professional_themes WHERE id = ?")->execute([$id]);
            ok();
            break;
        }

        case 'get_pro_theme': {
            // Returns the full theme object for a pro user (used during deploy / live preview).
            validateRequired($body, ['user_id']);
            $stmt = $db->prepare("
                SELECT pt.*
                FROM professional_profiles pp
                JOIN professional_themes pt ON pt.id = pp.theme_id
                WHERE pp.user_id = ?
                LIMIT 1
            ");
            $stmt->execute([(int)$body['user_id']]);
            $theme = $stmt->fetch();
            ok($theme ?: null);
            break;
        }

        // ── Header Images (main API — works for both pro-user session and admin) ──

        case 'get_header_images': {
            startSession();
            // Pro user (session) or admin passing user_id
            $userId = (int)($_SESSION['pro_user_id'] ?? 0);
            if (!$userId) {
                requireAdmin();
                validateRequired($body, ['user_id']);
                $userId = (int)$body['user_id'];
            }
            $stmt = $db->prepare(
                "SELECT header_images_json FROM professional_profiles WHERE user_id = ? LIMIT 1"
            );
            $stmt->execute([$userId]);
            $row    = $stmt->fetch();
            $images = ($row && $row['header_images_json'])
                ? json_decode($row['header_images_json'], true)
                : [];
            ok(is_array($images) ? $images : []);
            break;
        }

        case 'update_header_images': {
            startSession();
            $userId = (int)($_SESSION['pro_user_id'] ?? 0);
            if (!$userId) {
                requireAdmin();
                validateRequired($body, ['user_id']);
                $userId = (int)$body['user_id'];
            }
            $images = $body['images'] ?? [];
            if (!is_array($images)) fail('Format images invalide.', 400);
            $clean = array_values(array_filter(array_map('strval', $images)));
            $json  = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $db->prepare(
                "UPDATE professional_profiles SET header_images_json = ?, updated_at = NOW() WHERE user_id = ?"
            )->execute([$json, $userId]);
            ok(['images' => $clean]);
            break;
        }

        default:
            fail('Invalid action', 400);
    }

} catch (Throwable $e) {
    error_log('API ERROR: '.$e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : 'Server error', 500);
}
