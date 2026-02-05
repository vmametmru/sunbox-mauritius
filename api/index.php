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
            $stats['total_revenue'] = (float)$db->query("SELECT COALESCE(SUM(total_price),0) FROM quotes WHERE status='approved'")->fetchColumn();
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
                $planStmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'plan' ORDER BY id DESC LIMIT 1");
                $planStmt->execute([$m['id']]);
                $m['plan_url'] = ($row = $planStmt->fetch()) ? '/' . ltrim($row['file_path'], '/') : null;
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

        // === OPTIONS (Nouveau)
        case 'get_model_options': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail("model_id manquant");

            $stmt = $db->prepare("
                SELECT mo.*, oc.name as category_name
                FROM model_options mo
                LEFT JOIN option_categories oc ON mo.category_id = oc.id
                WHERE mo.model_id = ?
                ORDER BY oc.display_order ASC, mo.display_order ASC
            ");
            $stmt->execute([$modelId]);
            $options = $stmt->fetchAll();
            ok($options);
            break;
        }

        case 'create_option_category': {
            validateRequired($body, ['name']);
            $stmt = $db->prepare("INSERT INTO option_categories (name, display_order) VALUES (?, ?)");
            $stmt->execute([sanitize($body['name']), (int)($body['display_order'] ?? 0)]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_option_category': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("UPDATE option_categories SET name = ?, display_order = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([
                sanitize($body['name']),
                (int)($body['display_order'] ?? 0),
                (int)$body['id']
            ]);
            ok();
            break;
        }

        case 'delete_option_category': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("DELETE FROM option_categories WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'get_option_categories': {
            $stmt = $db->query("SELECT * FROM option_categories ORDER BY display_order ASC");
            ok($stmt->fetchAll());
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
                    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht, 2)), 0) AS total_cost_ht,
                    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2)), 0) AS total_sale_price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                WHERE bc.model_id = ?
                GROUP BY bc.id
                ORDER BY bc.display_order ASC, bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $categories = $stmt->fetchAll();
            
            foreach ($categories as &$cat) {
                $cat['is_option'] = (bool)$cat['is_option'];
                $cat['total_profit_ht'] = round((float)$cat['total_sale_price_ht'] - (float)$cat['total_cost_ht'], 2);
            }
            
            ok($categories);
            break;
        }

        case 'create_boq_category': {
            validateRequired($body, ['model_id', 'name']);
            $stmt = $db->prepare("
                INSERT INTO boq_categories (model_id, name, is_option, display_order)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                (int)$body['model_id'],
                sanitize($body['name']),
                (bool)($body['is_option'] ?? false),
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_boq_category': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE boq_categories SET
                    name = ?, is_option = ?, display_order = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['name']),
                (bool)($body['is_option'] ?? false),
                (int)($body['display_order'] ?? 0),
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
                    ROUND(bl.quantity * bl.unit_cost_ht, 2) AS total_cost_ht,
                    ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2) AS sale_price_ht
                FROM boq_lines bl
                LEFT JOIN suppliers s ON bl.supplier_id = s.id
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
                INSERT INTO boq_lines (category_id, description, quantity, unit, unit_cost_ht, supplier_id, margin_percent, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                (int)$body['category_id'],
                sanitize($body['description']),
                (float)($body['quantity'] ?? 1),
                sanitize($body['unit'] ?? 'unité'),
                (float)($body['unit_cost_ht'] ?? 0),
                !empty($body['supplier_id']) ? (int)$body['supplier_id'] : null,
                (float)($body['margin_percent'] ?? 30),
                (int)($body['display_order'] ?? 0),
            ]);
            ok(['id' => $db->lastInsertId()]);
            break;
        }

        case 'update_boq_line': {
            validateRequired($body, ['id']);
            $stmt = $db->prepare("
                UPDATE boq_lines SET
                    description = ?, quantity = ?, unit = ?, unit_cost_ht = ?,
                    supplier_id = ?, margin_percent = ?, display_order = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                sanitize($body['description']),
                (float)($body['quantity'] ?? 1),
                sanitize($body['unit'] ?? 'unité'),
                (float)($body['unit_cost_ht'] ?? 0),
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
                        INSERT INTO boq_lines (category_id, description, quantity, unit, unit_cost_ht, supplier_id, margin_percent, display_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $insertLine->execute([
                        $newCatId,
                        $line['description'],
                        $line['quantity'],
                        $line['unit'],
                        $line['unit_cost_ht'],
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
                SELECT bc.id, bc.name, bc.display_order,
                    COALESCE(SUM(ROUND(bl.quantity * bl.unit_cost_ht * (1 + bl.margin_percent / 100), 2)), 0) AS price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                WHERE bc.model_id = ? AND bc.is_option = TRUE
                GROUP BY bc.id
                ORDER BY bc.display_order ASC
            ");
            $stmt->execute([$modelId]);
            ok($stmt->fetchAll());
            break;
        }

        default:
            fail('Invalid action', 400);
    }

} catch (Throwable $e) {
    error_log('API ERROR: '.$e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : 'Server error', 500);
}
