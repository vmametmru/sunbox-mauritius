<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
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
                $planStmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'plan' ORDER BY id DESC LIMIT 1");
                $planStmt->execute([$m['id']]);
                $m['plan_url'] = ($row = $planStmt->fetch()) ? '/' . ltrim($row['file_path'], '/') : null;
                // Fetch photo image_url from model_images table (media_type = 'photo')
                // Falls back to the image_url column in models table if no photo found in model_images
                $photoStmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'photo' ORDER BY id DESC LIMIT 1");
                $photoStmt->execute([$m['id']]);
                $photoRow = $photoStmt->fetch();
                if ($photoRow && $photoRow['file_path']) {
                    $m['image_url'] = '/' . ltrim($photoRow['file_path'], '/');
                } elseif (!empty($m['image_url'])) {
                    // Use existing image_url from models table, ensure it has leading slash
                    $m['image_url'] = '/' . ltrim($m['image_url'], '/');
                }
                $m['has_overflow'] = (bool)$m['has_overflow'];
                
                // Calculate BOQ price if requested
                if ($includeBOQPrice) {
                    $boqStmt = $db->prepare("
                        SELECT 
                            COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2)), 0) AS boq_base_price_ht,
                            COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht, 2)), 0) AS boq_cost_ht
                        FROM boq_categories bc
                        LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                        WHERE bc.model_id = ? AND bc.is_option = FALSE
                    ");
                    $boqStmt->execute([$m['id']]);
                    $boqResult = $boqStmt->fetch();
                    
                    $boqPrice = (float)($boqResult['boq_base_price_ht'] ?? 0);
                    $m['boq_base_price_ht'] = $boqPrice;
                    $m['boq_cost_ht'] = (float)($boqResult['boq_cost_ht'] ?? 0);
                    
                    // Use BOQ price if available, otherwise use manual base_price
                    if ($boqPrice > 0) {
                        $m['calculated_base_price'] = $boqPrice;
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
                    name, type, description, base_price,
                    surface_m2, bedrooms, bathrooms,
                    container_20ft_count, container_40ft_count,
                    pool_shape, has_overflow,
                    image_url, plan_image_url,
                    features, is_active, display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                $body['type'],
                sanitize($body['description'] ?? ''),
                (float)$body['base_price'],
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
                'name','type','description','base_price','surface_m2',
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
                    } elseif (in_array($f, ['base_price','surface_m2'])) {
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
                    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht, 2)), 0) AS total_cost_ht,
                    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2)), 0) AS total_sale_price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
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
                INSERT INTO boq_categories (model_id, parent_id, name, is_option, display_order, image_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                (int)$body['model_id'],
                !empty($body['parent_id']) ? (int)$body['parent_id'] : null,
                sanitize($body['name']),
                (bool)($body['is_option'] ?? false),
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
                    name = ?, parent_id = ?, is_option = ?, display_order = ?, image_id = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['name']),
                !empty($body['parent_id']) ? (int)$body['parent_id'] : null,
                (bool)($body['is_option'] ?? false),
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
                    ROUND(bl.quantity * bl.unit_cost_ht, 2) AS total_cost_ht,
                    ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2) AS sale_price_ht
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

        // === GET MODEL WITH BOQ PRICE
        case 'get_model_boq_price': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");
            
            // Get base price from non-option BOQ categories
            $stmt = $db->prepare("
                SELECT 
                    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2)), 0) AS base_price_ht,
                    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht, 2)), 0) AS total_cost_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                WHERE bc.model_id = ? AND bc.is_option = FALSE
            ");
            $stmt->execute([$modelId]);
            $result = $stmt->fetch();
            
            ok([
                'model_id' => $modelId,
                'base_price_ht' => (float)$result['base_price_ht'],
                'total_cost_ht' => (float)$result['total_cost_ht'],
                'profit_ht' => round((float)$result['base_price_ht'] - (float)$result['total_cost_ht'], 2),
            ]);
            break;
        }

        // === GET BOQ OPTIONS (Categories marked as options for a model)
        case 'get_boq_options': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");
            
            $stmt = $db->prepare("
                SELECT bc.id, bc.name, bc.display_order, mi.file_path as image_path,
                    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2)), 0) AS price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN model_images mi ON bc.image_id = mi.id
                WHERE bc.model_id = ? AND bc.is_option = TRUE
                GROUP BY bc.id
                ORDER BY bc.display_order ASC
            ");
            $stmt->execute([$modelId]);
            $options = $stmt->fetchAll();
            foreach ($options as &$opt) {
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
            
            // Get categories that are NOT options (included in base price)
            $stmt = $db->prepare("
                SELECT bc.id, bc.name, bc.display_order
                FROM boq_categories bc
                WHERE bc.model_id = ? AND bc.is_option = FALSE
                ORDER BY bc.display_order ASC, bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $categories = $stmt->fetchAll();
            
            // For each category, get its lines
            $lineStmt = $db->prepare("
                SELECT id, description
                FROM boq_lines
                WHERE category_id = ?
                ORDER BY display_order ASC, id ASC
            ");
            
            foreach ($categories as &$cat) {
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
                ORDER BY display_order ASC, id ASC
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
            ok($stmt->fetchAll());
            break;
        }

        case 'create_pool_boq_template': {
            validateRequired($body, ['name']);
            $stmt = $db->prepare("
                INSERT INTO pool_boq_templates (name, description, is_default)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['description'] ?? ''),
                (bool)($body['is_default'] ?? false),
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_pool_boq_template': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE pool_boq_templates SET
                    name = ?, description = ?, is_default = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['description'] ?? ''),
                (bool)($body['is_default'] ?? false),
                (int)$body['id'],
            ]);
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

        default:
            fail('Invalid action', 400);
    }

} catch (Throwable $e) {
    error_log('API ERROR: '.$e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : 'Server error', 500);
}
