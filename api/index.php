<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

// Load Composer autoload for PHPMailer (needed for admin notification emails)
$autoloadPaths = [
    dirname(__DIR__) . '/vendor/autoload.php',
    __DIR__ . '/vendor/autoload.php',
    dirname(__DIR__, 2) . '/vendor/autoload.php',
    '/home/' . get_current_user() . '/vendor/autoload.php',
];
foreach ($autoloadPaths as $autoloadPath) {
    if (file_exists($autoloadPath)) {
        require_once $autoloadPath;
        break;
    }
}

require_once __DIR__ . '/email_helpers.php';
handleCORS();

$action = $_GET['action'] ?? '';
$body   = getRequestBody();

function fail(string $msg, int $code = 400): void {
    errorResponse($msg, $code);
}

function ok($data = null): void {
    successResponse($data);
}

try {
    $db = getDB();

    switch ($action) {
        // === DASHBOARD STATS
        case 'get_dashboard_stats': {
            $stats = [];
            $stats['total_quotes'] = (int)$db->query("SELECT COUNT(*) FROM quotes")->fetchColumn();
            $stats['pending_quotes'] = (int)$db->query("SELECT COUNT(*) FROM quotes WHERE status='pending'")->fetchColumn();
            $stats['approved_quotes'] = (int)$db->query("SELECT COUNT(*) FROM quotes WHERE status='approved'")->fetchColumn();
            $stats['today_quotes'] = (int)$db->query("SELECT COUNT(*) FROM quotes WHERE created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY")->fetchColumn();
            $stats['total_revenue'] = (float)$db->query("SELECT COALESCE(SUM(total_price),0) FROM quotes WHERE status='approved'")->fetchColumn();
            $stats['new_contacts'] = (int)$db->query("SELECT COUNT(*) FROM contacts WHERE status = 'new'")->fetchColumn();
            
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

        // === SETTINGS
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
                            COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS boq_base_price_ht,
                            COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht), 2)), 0) AS boq_cost_ht
                        FROM boq_categories bc
                        LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                        LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
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
            }

            ok($models);
            break;
        }

        case 'create_model': {
            validateRequired($body, ['name', 'type', 'base_price']);
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

        // === SUPPLIERS (Fournisseurs)
        case 'get_suppliers': {
            $activeOnly = $body['active_only'] ?? true;
            $sql = "SELECT * FROM suppliers";
            if ($activeOnly) {
                $sql .= " WHERE is_active = 1";
            }
            $sql .= " ORDER BY name ASC";
            $stmt = $db->query($sql);
            ok($stmt->fetchAll());
            break;
        }

        case 'create_supplier': {
            validateRequired($body, ['name']);
            $stmt = $db->prepare("
                INSERT INTO suppliers (name, city, phone, email, is_active)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['city'] ?? ''),
                sanitize($body['phone'] ?? ''),
                sanitize($body['email'] ?? ''),
                (bool)($body['is_active'] ?? true),
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_supplier': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE suppliers SET
                    name = ?, city = ?, phone = ?, email = ?, is_active = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['city'] ?? ''),
                sanitize($body['phone'] ?? ''),
                sanitize($body['email'] ?? ''),
                (bool)($body['is_active'] ?? true),
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
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht), 2)), 0) AS total_cost_ht,
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS total_sale_price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
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
                SELECT bl.*, s.name AS supplier_name, pl.name AS price_list_name, pl.unit_price AS price_list_unit_price,
                    ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht), 2) AS total_cost_ht,
                    ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2) AS sale_price_ht
                FROM boq_lines bl
                LEFT JOIN suppliers s ON bl.supplier_id = s.id
                LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
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
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS base_price_ht,
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht), 2)), 0) AS total_cost_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
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
            
            $stmt = $db->prepare("
                SELECT bc.id, bc.name, bc.display_order, bc.parent_id, bc.qty_editable, mi.file_path as image_path,
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
                LEFT JOIN model_images mi ON bc.image_id = mi.id
                WHERE bc.model_id = ? AND bc.is_option = TRUE
                GROUP BY bc.id
                ORDER BY bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $options = $stmt->fetchAll();
            foreach ($options as &$opt) {
                $opt['id'] = (int)$opt['id'];
                $opt['parent_id'] = $opt['parent_id'] ? (int)$opt['parent_id'] : null;
                $opt['display_order'] = (int)$opt['display_order'];
                $opt['qty_editable'] = (bool)($opt['qty_editable'] ?? false);
                $opt['image_url'] = $opt['image_path'] ? '/' . ltrim($opt['image_path'], '/') : null;
                unset($opt['image_path']);
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
            
            $stmt = $db->prepare("
                SELECT id, description
                FROM boq_lines
                WHERE category_id = ?
                ORDER BY description ASC
            ");
            $stmt->execute([$categoryId]);
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
            $validTypes = ['container', 'pool'];
            if (!in_array($body['model_type'], $validTypes)) {
                fail('Type de modèle invalide');
            }
            
            // Use transaction to prevent race conditions
            $db->beginTransaction();
            
            try {
                // Generate reference number: WCQ-yyyymm-xxxxxx (container) or WPQ-yyyymm-xxxxxx (pool)
                // The xxxxxx is a combined sequential counter shared between both types
                $yearMonth = date('Ym');
                $modelType = $body['model_type'];
                $prefix = ($modelType === 'container') ? 'WCQ' : 'WPQ';
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
                
                $stmt = $db->prepare("
                    INSERT INTO quotes (
                        reference_number, model_id, model_name, model_type,
                        base_price, options_total, total_price,
                        customer_name, customer_email, customer_phone,
                        customer_address, customer_message, contact_id,
                        status, valid_until
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
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
                
                $quoteId = $db->lastInsertId();
                
                // Update reference with actual quote ID for guaranteed uniqueness
                // WCQ-yyyymm-xxxxxx (container) or WPQ-yyyymm-xxxxxx (pool)
                $reference = sprintf('%s-%s-%06d', $prefix, $yearMonth, $quoteId);
                $db->prepare("UPDATE quotes SET reference_number = ? WHERE id = ?")->execute([$reference, $quoteId]);
                
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

                // Send admin notification email (best-effort, don't fail the quote)
                try {
                    $notifStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'admin_notification_email' AND setting_group = 'site'");
                    $notifStmt->execute();
                    $adminEmail = $notifStmt->fetchColumn();
                    if ($adminEmail) {
                        // Load email settings
                        $esStmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_group = 'email'");
                        $eSettings = [];
                        while ($er = $esStmt->fetch()) { $eSettings[$er['setting_key']] = $er['setting_value']; }
                        $eSettings = normalizeEmailSettings($eSettings);

                        // Try template first
                        $tplStmt = $db->prepare("SELECT * FROM email_templates WHERE template_key = 'admin_new_quote' AND is_active = 1");
                        $tplStmt->execute();
                        $tpl = $tplStmt->fetch();

                        $notifData = [
                            'to' => $adminEmail,
                            'subject' => 'Nouveau devis créé: ' . $reference,
                            'html' => '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">'
                                . '<h2 style="color:#1A365D;">Nouveau Devis Créé</h2>'
                                . '<p>Un client vient de créer un devis depuis le site.</p>'
                                . '<table style="width:100%;border-collapse:collapse;margin:20px 0;">'
                                . '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Référence</td><td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars($reference) . '</td></tr>'
                                . '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Client</td><td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars($customerName) . '</td></tr>'
                                . '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars($customerEmail) . '</td></tr>'
                                . '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Téléphone</td><td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars($customerPhone) . '</td></tr>'
                                . '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Modèle</td><td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars(sanitize($body['model_name'])) . '</td></tr>'
                                . '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Total</td><td style="padding:8px;border:1px solid #ddd;">' . number_format((float)$body['total_price'], 0, ',', ' ') . ' Rs</td></tr>'
                                . '</table>'
                                . '<p><a href="https://sunbox-mauritius.com/#/admin/quotes/' . $quoteId . '" style="display:inline-block;padding:10px 20px;background:#f97316;color:white;text-decoration:none;border-radius:4px;">Voir le devis</a></p>'
                                . '</div>',
                        ];

                        if ($tpl) {
                            $tvars = [
                                'reference' => $reference,
                                'customer_name' => $customerName,
                                'customer_email' => $customerEmail,
                                'customer_phone' => $customerPhone,
                                'model_name' => sanitize($body['model_name']),
                                'total_price' => number_format((float)$body['total_price'], 0, ',', ' ') . ' Rs',
                                'quote_url' => 'https://sunbox-mauritius.com/#/admin/quotes/' . $quoteId,
                            ];
                            $notifData['subject'] = replaceVariables($tpl['subject'], $tvars);
                            $notifData['html'] = replaceVariables($tpl['body_html'], $tvars);
                        }

                        if (!empty($eSettings['smtp_password'])) {
                            sendEmail($eSettings, $notifData);
                            logEmail($db, $notifData, 'sent', 'admin_new_quote');
                        }
                    }
                } catch (Exception $notifErr) {
                    error_log('Admin notification email failed: ' . $notifErr->getMessage());
                }

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

        // === ADMIN QUOTES (Free-form and Model-based)
        case 'create_admin_quote': {
            // Required for both free and model-based quotes
            validateRequired($body, ['customer_name', 'customer_email', 'customer_phone']);
            
            $isFreeQuote = $body['is_free_quote'] ?? false;
            $modelType = $body['model_type'] ?? 'container'; // Default to container for free quotes
            
            // Validate model_type
            $validTypes = ['container', 'pool'];
            if (!in_array($modelType, $validTypes)) {
                fail('Type de modèle invalide');
            }
            
            $db->beginTransaction();
            
            try {
                // Generate reference number
                $yearMonth = date('Ym');
                $prefix = $isFreeQuote ? 'WFQ' : (($modelType === 'container') ? 'WCQ' : 'WPQ');
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
                $stmt = $db->prepare("
                    INSERT INTO quotes (
                        reference_number, model_id, model_name, model_type,
                        base_price, options_total, total_price,
                        customer_name, customer_email, customer_phone,
                        customer_address, customer_message, contact_id,
                        status, valid_until, is_free_quote, quote_title,
                        margin_percent, photo_url, plan_url, cloned_from_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
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
                
                $quoteId = $db->lastInsertId();
                
                // Update reference with actual quote ID
                $reference = sprintf('%s-%s-%06d', $prefix, $yearMonth, $quoteId);
                $db->prepare("UPDATE quotes SET reference_number = ? WHERE id = ?")->execute([$reference, $quoteId]);
                
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
                // Build update query dynamically
                $updates = [];
                $params = [];
                
                $allowedFields = [
                    'model_id', 'model_name', 'model_type', 'base_price', 'options_total', 
                    'total_price', 'customer_name', 'customer_email', 'customer_phone',
                    'customer_address', 'customer_message', 'status', 'quote_title',
                    'margin_percent', 'photo_url', 'plan_url', 'notes'
                ];
                
                foreach ($allowedFields as $field) {
                    if (isset($body[$field])) {
                        $updates[] = "$field = ?";
                        if (in_array($field, ['base_price', 'options_total', 'total_price', 'margin_percent'])) {
                            $params[] = (float)$body[$field];
                        } elseif ($field === 'model_id') {
                            $params[] = $body[$field] ? (int)$body[$field] : null;
                        } else {
                            $params[] = sanitize($body[$field]);
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
                $prefix = $isFreeQuote ? 'WFQ' : (($modelType === 'container') ? 'WCQ' : 'WPQ');
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
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
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
            
            // Get quote options (for model-based quotes)
            $optStmt = $db->prepare("
                SELECT option_id, option_name, option_price
                FROM quote_options
                WHERE quote_id = ?
            ");
            $optStmt->execute([$id]);
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
            }
            
            ok($quote);
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
            ok($stmt->fetchAll());
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
                (bool)($body['has_vat'] ?? true),
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
                (bool)($body['has_vat'] ?? true),
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

        // === PDF TEMPLATES
        case 'get_pdf_templates': {
            $docType = $body['document_type'] ?? null;
            $sql = "SELECT * FROM pdf_templates WHERE 1=1";
            $params = [];
            if ($docType) {
                $sql .= " AND document_type = ?";
                $params[] = $docType;
            }
            $sql .= " ORDER BY created_at DESC";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                if (isset($r['grid_data']) && is_string($r['grid_data'])) {
                    $r['grid_data'] = json_decode($r['grid_data'], true);
                }
                if (isset($r['row_heights']) && is_string($r['row_heights'])) {
                    $r['row_heights'] = json_decode($r['row_heights'], true);
                }
                if (isset($r['col_widths']) && is_string($r['col_widths'])) {
                    $r['col_widths'] = json_decode($r['col_widths'], true);
                }
            }
            ok($rows);
            break;
        }

        case 'get_pdf_template': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("SELECT * FROM pdf_templates WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            $row = $stmt->fetch();
            if ($row) {
                if (isset($row['grid_data']) && is_string($row['grid_data'])) {
                    $row['grid_data'] = json_decode($row['grid_data'], true);
                }
                if (isset($row['row_heights']) && is_string($row['row_heights'])) {
                    $row['row_heights'] = json_decode($row['row_heights'], true);
                }
                if (isset($row['col_widths']) && is_string($row['col_widths'])) {
                    $row['col_widths'] = json_decode($row['col_widths'], true);
                }
            }
            ok($row ?: null);
            break;
        }

        case 'create_pdf_template': {
            validateRequired($body, ['name', 'document_type']);
            $validTypes = ['devis', 'rapport', 'facture'];
            if (!in_array($body['document_type'], $validTypes)) {
                fail('Type de document invalide');
            }

            $rowCount = (int)($body['row_count'] ?? 20);
            $colCount = (int)($body['col_count'] ?? 10);
            $gridData = $body['grid_data'] ?? [];
            $rowHeights = $body['row_heights'] ?? array_fill(0, $rowCount, 14);
            $colWidths = $body['col_widths'] ?? array_fill(0, $colCount, 19);

            // If setting as default, unset other defaults of same type
            if (!empty($body['is_default'])) {
                $db->prepare("UPDATE pdf_templates SET is_default = FALSE WHERE document_type = ?")->execute([$body['document_type']]);
            }

            $stmt = $db->prepare("
                INSERT INTO pdf_templates (name, description, document_type, grid_data, row_count, col_count, row_heights, col_widths, is_default, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['description'] ?? ''),
                $body['document_type'],
                json_encode($gridData),
                $rowCount,
                $colCount,
                json_encode($rowHeights),
                json_encode($colWidths),
                !empty($body['is_default']) ? 1 : 0,
                isset($body['is_active']) ? ($body['is_active'] ? 1 : 0) : 1,
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_pdf_template': {
            validateRequired($body, ['id']);
            $fields = [];
            $params = [];

            if (isset($body['name'])) { $fields[] = 'name = ?'; $params[] = sanitize($body['name']); }
            if (isset($body['description'])) { $fields[] = 'description = ?'; $params[] = sanitize($body['description']); }
            if (isset($body['document_type'])) {
                $validTypes = ['devis', 'rapport', 'facture'];
                if (!in_array($body['document_type'], $validTypes)) fail('Type de document invalide');
                $fields[] = 'document_type = ?'; $params[] = $body['document_type'];
            }
            if (isset($body['grid_data'])) { $fields[] = 'grid_data = ?'; $params[] = json_encode($body['grid_data']); }
            if (isset($body['row_count'])) { $fields[] = 'row_count = ?'; $params[] = (int)$body['row_count']; }
            if (isset($body['col_count'])) { $fields[] = 'col_count = ?'; $params[] = (int)$body['col_count']; }
            if (isset($body['row_heights'])) { $fields[] = 'row_heights = ?'; $params[] = json_encode($body['row_heights']); }
            if (isset($body['col_widths'])) { $fields[] = 'col_widths = ?'; $params[] = json_encode($body['col_widths']); }
            if (isset($body['is_active'])) { $fields[] = 'is_active = ?'; $params[] = $body['is_active'] ? 1 : 0; }

            if (isset($body['is_default']) && $body['is_default']) {
                // Get document_type first
                $typeStmt = $db->prepare("SELECT document_type FROM pdf_templates WHERE id = ?");
                $typeStmt->execute([(int)$body['id']]);
                $docType = $typeStmt->fetchColumn();
                if ($docType) {
                    $db->prepare("UPDATE pdf_templates SET is_default = FALSE WHERE document_type = ?")->execute([$docType]);
                }
                $fields[] = 'is_default = ?'; $params[] = 1;
            } elseif (isset($body['is_default'])) {
                $fields[] = 'is_default = ?'; $params[] = 0;
            }

            if (empty($fields)) fail('Aucun champ à mettre à jour');

            $params[] = (int)$body['id'];
            $db->prepare("UPDATE pdf_templates SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
            ok();
            break;
        }

        case 'delete_pdf_template': {
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM pdf_templates WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'get_default_pdf_template': {
            validateRequired($body, ['document_type']);
            $stmt = $db->prepare("SELECT * FROM pdf_templates WHERE document_type = ? AND is_default = 1 AND is_active = 1 LIMIT 1");
            $stmt->execute([$body['document_type']]);
            $row = $stmt->fetch();
            if (!$row) {
                // Fallback: get any active template of this type
                $stmt = $db->prepare("SELECT * FROM pdf_templates WHERE document_type = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1");
                $stmt->execute([$body['document_type']]);
                $row = $stmt->fetch();
            }
            if ($row) {
                if (isset($row['grid_data']) && is_string($row['grid_data'])) $row['grid_data'] = json_decode($row['grid_data'], true);
                if (isset($row['row_heights']) && is_string($row['row_heights'])) $row['row_heights'] = json_decode($row['row_heights'], true);
                if (isset($row['col_widths']) && is_string($row['col_widths'])) $row['col_widths'] = json_decode($row['col_widths'], true);
            }
            ok($row ?: null);
            break;
        }

        case 'render_pdf_html': {
            validateRequired($body, ['template_id', 'quote_id']);

            // Get template
            $tplStmt = $db->prepare("SELECT * FROM pdf_templates WHERE id = ?");
            $tplStmt->execute([(int)$body['template_id']]);
            $tpl = $tplStmt->fetch();
            if (!$tpl) fail('Template introuvable');

            $gridData = is_string($tpl['grid_data']) ? json_decode($tpl['grid_data'], true) : $tpl['grid_data'];
            $rowHeights = is_string($tpl['row_heights']) ? json_decode($tpl['row_heights'], true) : ($tpl['row_heights'] ?? []);
            $colWidths = is_string($tpl['col_widths']) ? json_decode($tpl['col_widths'], true) : ($tpl['col_widths'] ?? []);

            // Get quote
            $qStmt = $db->prepare("SELECT * FROM quotes WHERE id = ?");
            $qStmt->execute([(int)$body['quote_id']]);
            $q = $qStmt->fetch();
            if (!$q) fail('Devis introuvable');

            // Get quote options
            $optStmt = $db->prepare("SELECT * FROM quote_options WHERE quote_id = ?");
            $optStmt->execute([(int)$body['quote_id']]);
            $qOpts = $optStmt->fetchAll();

            // Get site settings
            $settingsStmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_group = 'site'");
            $siteSettings = [];
            while ($r = $settingsStmt->fetch()) { $siteSettings[$r['setting_key']] = $r['setting_value']; }

            $vatRate = (float)($siteSettings['vat_rate'] ?? 15);
            $totalHT = (float)$q['total_price'];
            $tva = round($totalHT * $vatRate / 100, 2);
            $totalTTC = round($totalHT + $tva, 2);

            // Build options text
            $optionsText = '';
            foreach ($qOpts as $o) {
                $optionsText .= $o['option_name'] . ' - ' . number_format((float)$o['option_price'], 0, ',', ' ') . " Rs\n";
            }

            // Build BOQ categories/lines data for the quote's model
            $modelId = (int)($q['model_id'] ?? 0);
            $baseCategoriesHtml = '';
            $optionCategoriesHtml = '';
            $baseCategoriesText = '';
            $optionCategoriesText = '';

            if ($modelId > 0) {
                // Get BOQ categories for this model
                $boqCatStmt = $db->prepare("
                    SELECT bc.id, bc.name, bc.is_option, bc.parent_id, bc.display_order
                    FROM boq_categories bc
                    WHERE bc.model_id = ?
                    ORDER BY bc.is_option ASC, bc.display_order ASC
                ");
                $boqCatStmt->execute([$modelId]);
                $allCats = $boqCatStmt->fetchAll();

                // Separate base and option categories, build parent-child structure
                $baseCats = [];
                $optionCats = [];
                $catMap = [];
                foreach ($allCats as $cat) {
                    $catMap[$cat['id']] = $cat;
                    $catMap[$cat['id']]['children'] = [];
                    $catMap[$cat['id']]['lines'] = [];
                }
                // Build hierarchy
                foreach ($allCats as $cat) {
                    if ($cat['parent_id'] && isset($catMap[$cat['parent_id']])) {
                        $catMap[$cat['parent_id']]['children'][] = &$catMap[$cat['id']];
                    } else {
                        if ($cat['is_option']) {
                            $optionCats[] = &$catMap[$cat['id']];
                        } else {
                            $baseCats[] = &$catMap[$cat['id']];
                        }
                    }
                }

                // Get lines for each category
                $boqLineStmt = $db->prepare("
                    SELECT bl.*, pl.unit_price as price_list_price
                    FROM boq_lines bl
                    LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
                    WHERE bl.category_id = ?
                    ORDER BY bl.display_order ASC
                ");

                foreach ($catMap as $catId => &$cat) {
                    $boqLineStmt->execute([$catId]);
                    $cat['lines'] = $boqLineStmt->fetchAll();
                }
                unset($cat);

                // Build HTML for base categories
                $baseCategoriesHtml = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9pt;">';
                foreach ($baseCats as $bcat) {
                    $baseCategoriesHtml .= '<tr style="background-color:#f0f0f0;"><td colspan="4" style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #ccc;">' . htmlspecialchars($bcat['name']) . '</td></tr>';
                    // Text format: Category (bold)
                    $baseCategoriesText .= '<b>' . htmlspecialchars($bcat['name']) . '</b>' . "\n";
                    // Sub-categories with lines inline
                    foreach ($bcat['children'] as $subcat) {
                        $baseCategoriesHtml .= '<tr style="background-color:#f8f8f8;"><td colspan="4" style="padding:3px 12px;font-weight:bold;font-size:8pt;border-bottom:1px solid #eee;">' . htmlspecialchars($subcat['name']) . '</td></tr>';
                        // Text format: SubCategory (Line1, Line2, ...)
                        $lineNames = [];
                        foreach ($subcat['lines'] as $line) {
                            $unitPrice = $line['price_list_price'] ? (float)$line['price_list_price'] : (float)$line['unit_cost_ht'];
                            $salePrice = round($unitPrice * (float)$line['quantity'] * (1 + (float)$line['margin_percent'] / 100), 2);
                            $baseCategoriesHtml .= '<tr><td style="padding:2px 18px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($line['description']) . '</td>';
                            $baseCategoriesHtml .= '<td style="padding:2px 4px;text-align:center;border-bottom:1px solid #f0f0f0;">' . (float)$line['quantity'] . ' ' . htmlspecialchars($line['unit'] ?? '') . '</td>';
                            $baseCategoriesHtml .= '<td style="padding:2px 4px;text-align:right;border-bottom:1px solid #f0f0f0;">' . number_format($unitPrice, 0, ',', ' ') . ' Rs</td>';
                            $baseCategoriesHtml .= '<td style="padding:2px 4px;text-align:right;border-bottom:1px solid #f0f0f0;">' . number_format($salePrice, 0, ',', ' ') . ' Rs</td></tr>';
                            $lineNames[] = htmlspecialchars($line['description']);
                        }
                        if (!empty($lineNames)) {
                            $baseCategoriesText .= htmlspecialchars($subcat['name']) . ' (' . implode(', ', $lineNames) . ')' . "\n";
                        }
                    }
                    // Direct lines (no sub-category)
                    $directLineNames = [];
                    foreach ($bcat['lines'] as $line) {
                        $unitPrice = $line['price_list_price'] ? (float)$line['price_list_price'] : (float)$line['unit_cost_ht'];
                        $salePrice = round($unitPrice * (float)$line['quantity'] * (1 + (float)$line['margin_percent'] / 100), 2);
                        $baseCategoriesHtml .= '<tr><td style="padding:2px 12px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($line['description']) . '</td>';
                        $baseCategoriesHtml .= '<td style="padding:2px 4px;text-align:center;border-bottom:1px solid #f0f0f0;">' . (float)$line['quantity'] . ' ' . htmlspecialchars($line['unit'] ?? '') . '</td>';
                        $baseCategoriesHtml .= '<td style="padding:2px 4px;text-align:right;border-bottom:1px solid #f0f0f0;">' . number_format($unitPrice, 0, ',', ' ') . ' Rs</td>';
                        $baseCategoriesHtml .= '<td style="padding:2px 4px;text-align:right;border-bottom:1px solid #f0f0f0;">' . number_format($salePrice, 0, ',', ' ') . ' Rs</td></tr>';
                        $directLineNames[] = htmlspecialchars($line['description']);
                    }
                    if (!empty($directLineNames)) {
                        $baseCategoriesText .= implode(', ', $directLineNames) . "\n";
                    }
                    $baseCategoriesText .= "\n";
                }
                $baseCategoriesHtml .= '</table>';

                // Build selected option names set from quote_options
                $selectedOptionNames = [];
                foreach ($qOpts as $o) {
                    $selectedOptionNames[] = strtolower(trim($o['option_name']));
                }

                // Build HTML for option categories (show all in HTML, but text only shows selected)
                $optionCategoriesHtml = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9pt;">';
                foreach ($optionCats as $ocat) {
                    $optionCategoriesHtml .= '<tr style="background-color:#fff3e0;"><td colspan="4" style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #ffcc80;">' . htmlspecialchars($ocat['name']) . '</td></tr>';
                    // For text: collect only selected lines across subcategories
                    $catHasSelected = false;
                    $catTextLines = [];
                    foreach ($ocat['children'] as $subcat) {
                        $optionCategoriesHtml .= '<tr style="background-color:#fff8e1;"><td colspan="4" style="padding:3px 12px;font-weight:bold;font-size:8pt;border-bottom:1px solid #ffe0b2;">' . htmlspecialchars($subcat['name']) . '</td></tr>';
                        $selectedLineNames = [];
                        foreach ($subcat['lines'] as $line) {
                            $unitPrice = $line['price_list_price'] ? (float)$line['price_list_price'] : (float)$line['unit_cost_ht'];
                            $salePrice = round($unitPrice * (float)$line['quantity'] * (1 + (float)$line['margin_percent'] / 100), 2);
                            $optionCategoriesHtml .= '<tr><td style="padding:2px 18px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($line['description']) . '</td>';
                            $optionCategoriesHtml .= '<td style="padding:2px 4px;text-align:center;border-bottom:1px solid #f0f0f0;">' . (float)$line['quantity'] . ' ' . htmlspecialchars($line['unit'] ?? '') . '</td>';
                            $optionCategoriesHtml .= '<td style="padding:2px 4px;text-align:right;border-bottom:1px solid #f0f0f0;">' . number_format($unitPrice, 0, ',', ' ') . ' Rs</td>';
                            $optionCategoriesHtml .= '<td style="padding:2px 4px;text-align:right;border-bottom:1px solid #f0f0f0;">' . number_format($salePrice, 0, ',', ' ') . ' Rs</td></tr>';
                            // Only include in text if this option was selected
                            if (in_array(strtolower(trim($line['description'])), $selectedOptionNames)) {
                                $selectedLineNames[] = htmlspecialchars($line['description']);
                            }
                        }
                        if (!empty($selectedLineNames)) {
                            $catHasSelected = true;
                            $catTextLines[] = htmlspecialchars($subcat['name']) . ' (' . implode(', ', $selectedLineNames) . ')';
                        }
                    }
                    // Direct lines
                    $selectedDirectLines = [];
                    foreach ($ocat['lines'] as $line) {
                        $unitPrice = $line['price_list_price'] ? (float)$line['price_list_price'] : (float)$line['unit_cost_ht'];
                        $salePrice = round($unitPrice * (float)$line['quantity'] * (1 + (float)$line['margin_percent'] / 100), 2);
                        $optionCategoriesHtml .= '<tr><td style="padding:2px 12px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($line['description']) . '</td>';
                        $optionCategoriesHtml .= '<td style="padding:2px 4px;text-align:center;border-bottom:1px solid #f0f0f0;">' . (float)$line['quantity'] . ' ' . htmlspecialchars($line['unit'] ?? '') . '</td>';
                        $optionCategoriesHtml .= '<td style="padding:2px 4px;text-align:right;border-bottom:1px solid #f0f0f0;">' . number_format($unitPrice, 0, ',', ' ') . ' Rs</td>';
                        $optionCategoriesHtml .= '<td style="padding:2px 4px;text-align:right;border-bottom:1px solid #f0f0f0;">' . number_format($salePrice, 0, ',', ' ') . ' Rs</td></tr>';
                        if (in_array(strtolower(trim($line['description'])), $selectedOptionNames)) {
                            $selectedDirectLines[] = htmlspecialchars($line['description']);
                            $catHasSelected = true;
                        }
                    }
                    // Only add category to text if it has selected options
                    if ($catHasSelected) {
                        $optionCategoriesText .= '<b>' . htmlspecialchars($ocat['name']) . '</b>' . "\n";
                        foreach ($catTextLines as $tl) {
                            $optionCategoriesText .= $tl . "\n";
                        }
                        if (!empty($selectedDirectLines)) {
                            $optionCategoriesText .= implode(', ', $selectedDirectLines) . "\n";
                        }
                        $optionCategoriesText .= "\n";
                    }
                }
                $optionCategoriesHtml .= '</table>';
            }

            // Variables map
            $vars = [
                '{{reference}}' => $q['reference_number'] ?? '',
                '{{customer_name}}' => $q['customer_name'] ?? '',
                '{{customer_email}}' => $q['customer_email'] ?? '',
                '{{customer_phone}}' => $q['customer_phone'] ?? '',
                '{{customer_address}}' => $q['customer_address'] ?? '',
                '{{customer_message}}' => $q['customer_message'] ?? '',
                '{{model_name}}' => $q['model_name'] ?? '',
                '{{model_type}}' => $q['model_type'] ?? '',
                '{{base_price}}' => number_format((float)$q['base_price'], 0, ',', ' ') . ' Rs',
                '{{options_total}}' => number_format((float)$q['options_total'], 0, ',', ' ') . ' Rs',
                '{{total_ht}}' => number_format($totalHT, 0, ',', ' ') . ' Rs',
                '{{tva}}' => number_format($tva, 0, ',', ' ') . ' Rs',
                '{{tva_rate}}' => $vatRate . '%',
                '{{total_ttc}}' => number_format($totalTTC, 0, ',', ' ') . ' Rs',
                '{{options_list}}' => $optionsText,
                '{{valid_until}}' => $q['valid_until'] ? date('d/m/Y', strtotime($q['valid_until'])) : '',
                '{{created_at}}' => date('d/m/Y', strtotime($q['created_at'])),
                '{{status}}' => $q['status'] ?? '',
                '{{payment_terms}}' => $siteSettings['payment_terms'] ?? '',
                '{{bank_account}}' => $siteSettings['bank_account'] ?? '',
                '{{company_phone}}' => $siteSettings['company_phone'] ?? '',
                '{{company_email}}' => $siteSettings['company_email'] ?? '',
                '{{company_address}}' => $siteSettings['company_address'] ?? '',
                '{{site_slogan}}' => $siteSettings['site_slogan'] ?? '',
                '{{date_today}}' => date('d/m/Y'),
                '{{base_categories}}' => $baseCategoriesText,
                '{{base_categories_html}}' => $baseCategoriesHtml,
                '{{option_categories}}' => $optionCategoriesText,
                '{{option_categories_html}}' => $optionCategoriesHtml,
            ];

            // Logo vars
            $logoUrl = $siteSettings['pdf_logo'] ?? $siteSettings['site_logo'] ?? '';

            // Render HTML table
            $rowCount = (int)$tpl['row_count'];
            $colCount = (int)$tpl['col_count'];
            $cells = $gridData ?: [];

            // Build merged cell tracking
            $mergedCells = [];
            foreach ($cells as $key => $cell) {
                if (!empty($cell['merged'])) {
                    $colspan = (int)($cell['colspan'] ?? 1);
                    $rowspan = (int)($cell['rowspan'] ?? 1);
                    $parts = explode('-', $key);
                    $sr = (int)$parts[0]; $sc = (int)$parts[1];
                    for ($r2 = $sr; $r2 < $sr + $rowspan; $r2++) {
                        for ($c2 = $sc; $c2 < $sc + $colspan; $c2++) {
                            if ($r2 !== $sr || $c2 !== $sc) {
                                $mergedCells["$r2-$c2"] = true;
                            }
                        }
                    }
                }
            }

            $html = '<table style="width:190mm;border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;font-size:10pt;">';
            // Colgroup
            $html .= '<colgroup>';
            for ($c = 0; $c < $colCount; $c++) {
                $w = isset($colWidths[$c]) ? $colWidths[$c] : 19;
                $html .= '<col style="width:' . $w . 'mm">';
            }
            $html .= '</colgroup>';

            for ($r = 0; $r < $rowCount; $r++) {
                $rh = isset($rowHeights[$r]) ? $rowHeights[$r] : 14;
                $html .= '<tr style="height:' . $rh . 'mm;">';
                for ($c = 0; $c < $colCount; $c++) {
                    $cellKey = "$r-$c";
                    if (isset($mergedCells[$cellKey])) continue;

                    $cell = $cells[$cellKey] ?? null;
                    $colspan = ($cell && !empty($cell['colspan'])) ? (int)$cell['colspan'] : 1;
                    $rowspan = ($cell && !empty($cell['rowspan'])) ? (int)$cell['rowspan'] : 1;
                    $content = $cell['content'] ?? '';
                    $styles = [];

                    if (!empty($cell['bold'])) $styles[] = 'font-weight:bold';
                    if (!empty($cell['italic'])) $styles[] = 'font-style:italic';
                    if (!empty($cell['underline'])) $styles[] = 'text-decoration:underline';
                    if (!empty($cell['fontSize'])) $styles[] = 'font-size:' . $cell['fontSize'] . 'pt';
                    if (!empty($cell['fontFamily'])) $styles[] = 'font-family:' . htmlspecialchars($cell['fontFamily']);
                    if (!empty($cell['textAlign'])) $styles[] = 'text-align:' . $cell['textAlign'];
                    if (!empty($cell['bgColor'])) $styles[] = 'background-color:' . htmlspecialchars($cell['bgColor']);
                    if (!empty($cell['color'])) $styles[] = 'color:' . htmlspecialchars($cell['color']);
                    $styles[] = 'padding:2mm';
                    $styles[] = 'vertical-align:middle';
                    $styles[] = 'overflow:hidden';
                    $styles[] = 'word-wrap:break-word';

                    // Replace variables
                    $rendered = $content;
                    // HTML variables should not be escaped
                    $htmlVars = ['{{base_categories_html}}', '{{option_categories_html}}', '{{base_categories}}', '{{option_categories}}'];
                    foreach ($vars as $vk => $vv) {
                        if (in_array($vk, $htmlVars)) {
                            $rendered = str_replace($vk, $vv, $rendered);
                        } else {
                            $rendered = str_replace($vk, htmlspecialchars($vv), $rendered);
                        }
                    }

                    // Handle image variables
                    if (!empty($cell['type']) && $cell['type'] === 'image') {
                        $imgUrl = $cell['imageUrl'] ?? '';
                        if ($imgUrl === '{{logo}}') $imgUrl = $logoUrl;
                        $rendered = $imgUrl ? '<img src="' . htmlspecialchars($imgUrl) . '" style="max-width:100%;max-height:100%;object-fit:contain;" />' : '';
                    }

                    $attrStr = '';
                    if ($colspan > 1) $attrStr .= ' colspan="' . $colspan . '"';
                    if ($rowspan > 1) $attrStr .= ' rowspan="' . $rowspan . '"';

                    $html .= '<td' . $attrStr . ' style="' . implode(';', $styles) . '">' . $rendered . '</td>';
                }
                $html .= '</tr>';
            }
            $html .= '</table>';

            ok(['html' => $html, 'vars' => array_keys($vars)]);
            break;
        }

        case 'send_quote_pdf_email': {
            validateRequired($body, ['quote_id']);

            // Get default devis template
            $tplStmt = $db->prepare("SELECT * FROM pdf_templates WHERE document_type = 'devis' AND is_default = 1 AND is_active = 1 LIMIT 1");
            $tplStmt->execute();
            $tpl = $tplStmt->fetch();
            if (!$tpl) {
                // Fallback: any active devis template
                $tplStmt = $db->prepare("SELECT * FROM pdf_templates WHERE document_type = 'devis' AND is_active = 1 ORDER BY created_at DESC LIMIT 1");
                $tplStmt->execute();
                $tpl = $tplStmt->fetch();
            }
            if (!$tpl) fail('Aucun template PDF devis trouvé');

            // Get quote
            $qStmt = $db->prepare("SELECT * FROM quotes WHERE id = ?");
            $qStmt->execute([(int)$body['quote_id']]);
            $q = $qStmt->fetch();
            if (!$q) fail('Devis introuvable');
            if (empty($q['customer_email'])) fail('Email client manquant');

            // Render the PDF HTML by internally calling the render logic
            // We reconstruct the HTML here to avoid code duplication issues
            $renderBody = ['template_id' => $tpl['id'], 'quote_id' => $body['quote_id']];

            // Use an internal function call approach: we'll build the HTML inline
            $gridData = is_string($tpl['grid_data']) ? json_decode($tpl['grid_data'], true) : $tpl['grid_data'];
            $rowHeights = is_string($tpl['row_heights']) ? json_decode($tpl['row_heights'], true) : ($tpl['row_heights'] ?? []);
            $colWidths = is_string($tpl['col_widths']) ? json_decode($tpl['col_widths'], true) : ($tpl['col_widths'] ?? []);

            $optStmt = $db->prepare("SELECT * FROM quote_options WHERE quote_id = ?");
            $optStmt->execute([(int)$body['quote_id']]);
            $qOpts = $optStmt->fetchAll();

            $settingsStmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_group = 'site'");
            $siteSettings = [];
            while ($r = $settingsStmt->fetch()) { $siteSettings[$r['setting_key']] = $r['setting_value']; }

            $vatRate = (float)($siteSettings['vat_rate'] ?? 15);
            $totalHT = (float)$q['total_price'];
            $tva = round($totalHT * $vatRate / 100, 2);
            $totalTTC = round($totalHT + $tva, 2);

            $optionsText = '';
            foreach ($qOpts as $o) {
                $optionsText .= $o['option_name'] . ' - ' . number_format((float)$o['option_price'], 0, ',', ' ') . " Rs\n";
            }

            // BOQ data
            $modelId = (int)($q['model_id'] ?? 0);
            $baseCategoriesHtml = '';
            $optionCategoriesHtml = '';
            $baseCategoriesText = '';
            $optionCategoriesText = '';
            if ($modelId > 0) {
                $boqCatStmt = $db->prepare("
                    SELECT bc.id, bc.name, bc.is_option, bc.parent_id, bc.display_order
                    FROM boq_categories bc WHERE bc.model_id = ?
                    ORDER BY bc.is_option ASC, bc.display_order ASC
                ");
                $boqCatStmt->execute([$modelId]);
                $allCats = $boqCatStmt->fetchAll();
                $baseCats = [];
                $optionCats = [];
                $catMap = [];
                foreach ($allCats as $cat) {
                    $catMap[$cat['id']] = $cat;
                    $catMap[$cat['id']]['children'] = [];
                    $catMap[$cat['id']]['lines'] = [];
                }
                foreach ($allCats as $cat) {
                    if ($cat['parent_id'] && isset($catMap[$cat['parent_id']])) {
                        $catMap[$cat['parent_id']]['children'][] = &$catMap[$cat['id']];
                    } else {
                        if ($cat['is_option']) {
                            $optionCats[] = &$catMap[$cat['id']];
                        } else {
                            $baseCats[] = &$catMap[$cat['id']];
                        }
                    }
                }
                $boqLineStmt = $db->prepare("
                    SELECT bl.*, pl.unit_price as price_list_price
                    FROM boq_lines bl
                    LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
                    WHERE bl.category_id = ?
                    ORDER BY bl.display_order ASC
                ");
                foreach ($catMap as $catId => &$cat) {
                    $boqLineStmt->execute([$catId]);
                    $cat['lines'] = $boqLineStmt->fetchAll();
                }
                unset($cat);

                // Helper to render a BOQ line as HTML table row
                $renderLineRow = function($line, $indent) {
                    $unitPrice = $line['price_list_price'] ? (float)$line['price_list_price'] : (float)$line['unit_cost_ht'];
                    $salePrice = round($unitPrice * (float)$line['quantity'] * (1 + (float)$line['margin_percent'] / 100), 2);
                    return '<tr>'
                        . '<td style="padding:2px ' . $indent . 'px;">' . htmlspecialchars($line['description']) . '</td>'
                        . '<td style="text-align:center;">' . (float)$line['quantity'] . '</td>'
                        . '<td style="text-align:right;">' . number_format($unitPrice, 0, ',', ' ') . ' Rs</td>'
                        . '<td style="text-align:right;">' . number_format($salePrice, 0, ',', ' ') . ' Rs</td>'
                        . '</tr>';
                };

                $baseCategoriesHtml = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9pt;">';
                foreach ($baseCats as $bcat) {
                    $baseCategoriesHtml .= '<tr style="background-color:#f0f0f0;"><td colspan="4" style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #ccc;">' . htmlspecialchars($bcat['name']) . '</td></tr>';
                    $baseCategoriesText .= '<b>' . htmlspecialchars($bcat['name']) . '</b>' . "\n";
                    foreach ($bcat['children'] as $subcat) {
                        $baseCategoriesHtml .= '<tr style="background-color:#f8f8f8;"><td colspan="4" style="padding:3px 12px;font-weight:bold;font-size:8pt;">' . htmlspecialchars($subcat['name']) . '</td></tr>';
                        $lineNames = [];
                        foreach ($subcat['lines'] as $line) {
                            $baseCategoriesHtml .= $renderLineRow($line, 18);
                            $lineNames[] = htmlspecialchars($line['description']);
                        }
                        if (!empty($lineNames)) {
                            $baseCategoriesText .= htmlspecialchars($subcat['name']) . ' (' . implode(', ', $lineNames) . ')' . "\n";
                        }
                    }
                    $directLineNames = [];
                    foreach ($bcat['lines'] as $line) {
                        $baseCategoriesHtml .= $renderLineRow($line, 12);
                        $directLineNames[] = htmlspecialchars($line['description']);
                    }
                    if (!empty($directLineNames)) {
                        $baseCategoriesText .= implode(', ', $directLineNames) . "\n";
                    }
                    $baseCategoriesText .= "\n";
                }
                $baseCategoriesHtml .= '</table>';

                // Build selected option names set from quote_options
                $selectedOptionNames = [];
                foreach ($qOpts as $o) {
                    $selectedOptionNames[] = strtolower(trim($o['option_name']));
                }

                $optionCategoriesHtml = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9pt;">';
                foreach ($optionCats as $ocat) {
                    $optionCategoriesHtml .= '<tr style="background-color:#fff3e0;"><td colspan="4" style="padding:4px 6px;font-weight:bold;">' . htmlspecialchars($ocat['name']) . '</td></tr>';
                    $catHasSelected = false;
                    $catTextLines = [];
                    foreach ($ocat['children'] as $subcat) {
                        $optionCategoriesHtml .= '<tr style="background-color:#fff8e1;"><td colspan="4" style="padding:3px 12px;font-weight:bold;font-size:8pt;">' . htmlspecialchars($subcat['name']) . '</td></tr>';
                        $selectedLineNames = [];
                        foreach ($subcat['lines'] as $line) {
                            $optionCategoriesHtml .= $renderLineRow($line, 18);
                            if (in_array(strtolower(trim($line['description'])), $selectedOptionNames)) {
                                $selectedLineNames[] = htmlspecialchars($line['description']);
                            }
                        }
                        if (!empty($selectedLineNames)) {
                            $catHasSelected = true;
                            $catTextLines[] = htmlspecialchars($subcat['name']) . ' (' . implode(', ', $selectedLineNames) . ')';
                        }
                    }
                    $selectedDirectLines = [];
                    foreach ($ocat['lines'] as $line) {
                        $optionCategoriesHtml .= $renderLineRow($line, 12);
                        if (in_array(strtolower(trim($line['description'])), $selectedOptionNames)) {
                            $selectedDirectLines[] = htmlspecialchars($line['description']);
                            $catHasSelected = true;
                        }
                    }
                    if ($catHasSelected) {
                        $optionCategoriesText .= '<b>' . htmlspecialchars($ocat['name']) . '</b>' . "\n";
                        foreach ($catTextLines as $tl) {
                            $optionCategoriesText .= $tl . "\n";
                        }
                        if (!empty($selectedDirectLines)) {
                            $optionCategoriesText .= implode(', ', $selectedDirectLines) . "\n";
                        }
                        $optionCategoriesText .= "\n";
                    }
                }
                $optionCategoriesHtml .= '</table>';
            }

            $vars = [
                '{{reference}}' => $q['reference_number'] ?? '',
                '{{customer_name}}' => $q['customer_name'] ?? '',
                '{{customer_email}}' => $q['customer_email'] ?? '',
                '{{customer_phone}}' => $q['customer_phone'] ?? '',
                '{{customer_address}}' => $q['customer_address'] ?? '',
                '{{customer_message}}' => $q['customer_message'] ?? '',
                '{{model_name}}' => $q['model_name'] ?? '',
                '{{model_type}}' => $q['model_type'] ?? '',
                '{{base_price}}' => number_format((float)$q['base_price'], 0, ',', ' ') . ' Rs',
                '{{options_total}}' => number_format((float)$q['options_total'], 0, ',', ' ') . ' Rs',
                '{{total_ht}}' => number_format($totalHT, 0, ',', ' ') . ' Rs',
                '{{tva}}' => number_format($tva, 0, ',', ' ') . ' Rs',
                '{{tva_rate}}' => $vatRate . '%',
                '{{total_ttc}}' => number_format($totalTTC, 0, ',', ' ') . ' Rs',
                '{{options_list}}' => $optionsText,
                '{{valid_until}}' => $q['valid_until'] ? date('d/m/Y', strtotime($q['valid_until'])) : '',
                '{{created_at}}' => date('d/m/Y', strtotime($q['created_at'])),
                '{{status}}' => $q['status'] ?? '',
                '{{payment_terms}}' => $siteSettings['payment_terms'] ?? '',
                '{{bank_account}}' => $siteSettings['bank_account'] ?? '',
                '{{company_phone}}' => $siteSettings['company_phone'] ?? '',
                '{{company_email}}' => $siteSettings['company_email'] ?? '',
                '{{company_address}}' => $siteSettings['company_address'] ?? '',
                '{{site_slogan}}' => $siteSettings['site_slogan'] ?? '',
                '{{date_today}}' => date('d/m/Y'),
                '{{base_categories}}' => $baseCategoriesText,
                '{{base_categories_html}}' => $baseCategoriesHtml,
                '{{option_categories}}' => $optionCategoriesText,
                '{{option_categories_html}}' => $optionCategoriesHtml,
            ];

            $logoUrl = $siteSettings['pdf_logo'] ?? $siteSettings['site_logo'] ?? '';
            $rowCount = (int)$tpl['row_count'];
            $colCount = (int)$tpl['col_count'];
            $cells = $gridData ?: [];

            $mergedCells = [];
            foreach ($cells as $key => $cell) {
                if (!empty($cell['merged'])) {
                    $colspan = (int)($cell['colspan'] ?? 1);
                    $rowspan = (int)($cell['rowspan'] ?? 1);
                    $parts = explode('-', $key);
                    $sr = (int)$parts[0]; $sc = (int)$parts[1];
                    for ($r2 = $sr; $r2 < $sr + $rowspan; $r2++) { for ($c2 = $sc; $c2 < $sc + $colspan; $c2++) { if ($r2 !== $sr || $c2 !== $sc) { $mergedCells["$r2-$c2"] = true; } } }
                }
            }

            $pdfHtml = '<table style="width:190mm;border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;font-size:10pt;">';
            $pdfHtml .= '<colgroup>';
            for ($c = 0; $c < $colCount; $c++) { $w = isset($colWidths[$c]) ? $colWidths[$c] : 19; $pdfHtml .= '<col style="width:' . $w . 'mm">'; }
            $pdfHtml .= '</colgroup>';
            $htmlVars = ['{{base_categories_html}}', '{{option_categories_html}}', '{{base_categories}}', '{{option_categories}}'];
            for ($r = 0; $r < $rowCount; $r++) {
                $rh = isset($rowHeights[$r]) ? $rowHeights[$r] : 14;
                $pdfHtml .= '<tr style="height:' . $rh . 'mm;">';
                for ($c = 0; $c < $colCount; $c++) {
                    $cellKey = "$r-$c";
                    if (isset($mergedCells[$cellKey])) continue;
                    $cell = $cells[$cellKey] ?? null;
                    $colspan = ($cell && !empty($cell['colspan'])) ? (int)$cell['colspan'] : 1;
                    $rowspan = ($cell && !empty($cell['rowspan'])) ? (int)$cell['rowspan'] : 1;
                    $content = $cell['content'] ?? '';
                    $styles = [];
                    if (!empty($cell['bold'])) $styles[] = 'font-weight:bold';
                    if (!empty($cell['italic'])) $styles[] = 'font-style:italic';
                    if (!empty($cell['underline'])) $styles[] = 'text-decoration:underline';
                    if (!empty($cell['fontSize'])) $styles[] = 'font-size:' . $cell['fontSize'] . 'pt';
                    if (!empty($cell['fontFamily'])) $styles[] = 'font-family:' . htmlspecialchars($cell['fontFamily']);
                    if (!empty($cell['textAlign'])) $styles[] = 'text-align:' . $cell['textAlign'];
                    if (!empty($cell['bgColor'])) $styles[] = 'background-color:' . htmlspecialchars($cell['bgColor']);
                    if (!empty($cell['color'])) $styles[] = 'color:' . htmlspecialchars($cell['color']);
                    $styles[] = 'padding:2mm'; $styles[] = 'vertical-align:middle'; $styles[] = 'overflow:hidden'; $styles[] = 'word-wrap:break-word';
                    $rendered = $content;
                    foreach ($vars as $vk => $vv) { if (in_array($vk, $htmlVars)) { $rendered = str_replace($vk, $vv, $rendered); } else { $rendered = str_replace($vk, htmlspecialchars($vv), $rendered); } }
                    if (!empty($cell['type']) && $cell['type'] === 'image') { $imgUrl = $cell['imageUrl'] ?? ''; if ($imgUrl === '{{logo}}') $imgUrl = $logoUrl; $rendered = $imgUrl ? '<img src="' . htmlspecialchars($imgUrl) . '" style="max-width:100%;max-height:100%;object-fit:contain;" />' : ''; }
                    $attrStr = '';
                    if ($colspan > 1) $attrStr .= ' colspan="' . $colspan . '"';
                    if ($rowspan > 1) $attrStr .= ' rowspan="' . $rowspan . '"';
                    $pdfHtml .= '<td' . $attrStr . ' style="' . implode(';', $styles) . '">' . $rendered . '</td>';
                }
                $pdfHtml .= '</tr>';
            }
            $pdfHtml .= '</table>';

            // Build full PDF page HTML for attachment
            $fullPdfHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Devis ' . htmlspecialchars($q['reference_number'] ?? '') . '</title>'
                . '<style>@page{size:A4;margin:10mm}body{margin:0;padding:10mm;font-family:Arial,sans-serif}</style></head><body>'
                . $pdfHtml . '</body></html>';

            // Load email settings
            $esStmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_group = 'email'");
            $eSettings = [];
            while ($er = $esStmt->fetch()) { $eSettings[$er['setting_key']] = $er['setting_value']; }
            $eSettings = normalizeEmailSettings($eSettings);

            // Build email
            $customerName = $q['customer_name'] ?? 'Client';
            $reference = $q['reference_number'] ?? '';
            $emailSubject = 'Votre devis ' . $reference . ' - Sunbox Mauritius';
            $emailHtml = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">'
                . '<h2 style="color:#1A365D;">Votre Devis Approuvé</h2>'
                . '<p>Bonjour ' . htmlspecialchars($customerName) . ',</p>'
                . '<p>Veuillez trouver ci-joint votre devis <strong>' . htmlspecialchars($reference) . '</strong> pour le modèle <strong>' . htmlspecialchars($q['model_name'] ?? '') . '</strong>.</p>'
                . '<p>Montant total TTC: <strong>' . number_format($totalTTC, 0, ',', ' ') . ' Rs</strong></p>'
                . '<p>Ce devis est valable jusqu\'au ' . ($q['valid_until'] ? date('d/m/Y', strtotime($q['valid_until'])) : 'N/A') . '.</p>'
                . '<p>N\'hésitez pas à nous contacter pour toute question.</p>'
                . '<p>Cordialement,<br>L\'équipe Sunbox Mauritius</p>'
                . '</div>';

            // Try to use a template if one exists
            $tplEmail = $db->prepare("SELECT * FROM email_templates WHERE template_key = 'quote_approved' AND is_active = 1");
            $tplEmail->execute();
            $emailTpl = $tplEmail->fetch();
            if ($emailTpl) {
                $tvars = [
                    'customer_name' => $customerName,
                    'reference' => $reference,
                    'model_name' => $q['model_name'] ?? '',
                    'total_price' => number_format($totalTTC, 0, ',', ' ') . ' Rs',
                ];
                $emailSubject = replaceVariables($emailTpl['subject'], $tvars);
                $emailHtml = replaceVariables($emailTpl['body_html'], $tvars);
            }

            $emailData = [
                'to' => $q['customer_email'],
                'subject' => $emailSubject,
                'html' => $emailHtml,
                'attachments' => [
                    [
                        'content' => $fullPdfHtml,
                        'name' => 'Devis_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $reference) . '.html',
                    ]
                ],
            ];

            if (!empty($eSettings['smtp_password'])) {
                $sent = sendEmail($eSettings, $emailData);
                logEmail($db, $emailData, $sent ? 'sent' : 'failed', 'quote_approved_pdf');
                if ($sent) {
                    ok(['message' => 'Email envoyé avec le PDF en pièce jointe']);
                } else {
                    fail('Erreur lors de l\'envoi de l\'email');
                }
            } else {
                fail('Configuration SMTP manquante');
            }
            break;
        }

        default:
            fail('Invalid action', 400);
    }

} catch (Throwable $e) {
    error_log('API ERROR: '.$e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : 'Server error', 500);
}
