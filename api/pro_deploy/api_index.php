<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

handleCORS();
startSession();

$action = $_GET['action'] ?? '';
$body   = getRequestBody();

function ok($data = null): void { successResponse($data); }
function fail(string $msg, int $code = 400): void { errorResponse($msg, $code); }

try {

    switch ($action) {

        // ── ADMIN AUTH ─────────────────────────────────────────────────────────
        case 'login': {
            validateRequired($body, ['password']);
            $hash = (string)env('ADMIN_PASSWORD_HASH', '');
            if (!$hash || !password_verify((string)$body['password'], $hash)) {
                fail('Mot de passe incorrect.', 401);
            }
            session_regenerate_id(true);
            $_SESSION['is_admin'] = true;
            ok(['is_admin' => true]);
            break;
        }

        case 'logout': {
            $_SESSION = [];
            session_destroy();
            ok(['is_admin' => false]);
            break;
        }

        case 'me': {
            ok(['is_admin' => !empty($_SESSION['is_admin'])]);
            break;
        }

        // ── MODELS (direct from Sunbox DB — no HTTP) ──────────────────────────
        case 'get_models': {
            $result = fetchModels();
            ok($result);
            break;
        }

        case 'check_credits': {
            $result = checkCredits();
            ok($result);
            break;
        }

        // ── CONFIGURATOR: all read directly from Sunbox DB ─────────────────────

        case 'get_model_options': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail('model_id manquant');
            $sdb  = getSunboxDB();
            $stmt = $sdb->prepare("
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
                $opt['category_image_url'] = sunboxAbsUrl(
                    $opt['category_image_path'] ? '/' . ltrim($opt['category_image_path'], '/') : null
                );
                unset($opt['category_image_path']);
            }
            ok($options);
            break;
        }

        case 'get_boq_options': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail('model_id manquant');
            $sdb = getSunboxDB();

            // Step 1: Fetch ALL option categories (including sub-categories) with their own direct-line prices.
            $stmt = $sdb->prepare("
                SELECT bc.id, bc.name, bc.parent_id, bc.display_order, bc.qty_editable,
                       mi.file_path as image_path,
                       COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS own_price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
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
                if ($cat['parent_id'] !== null) continue;
                $id = (int)$cat['id'];
                $options[] = [
                    'id'            => $id,
                    'name'          => $cat['name'],
                    'display_order' => (int)$cat['display_order'],
                    'qty_editable'  => (bool)($cat['qty_editable'] ?? false),
                    'image_url'     => sunboxAbsUrl(
                        $cat['image_path'] ? '/' . ltrim($cat['image_path'], '/') : null
                    ),
                    'price_ht'      => round($getTotalPrice($id), 2),
                ];
            }
            ok($options);
            break;
        }

        case 'get_boq_base_categories': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail('model_id manquant');
            $sdb  = getSunboxDB();
            $stmt = $sdb->prepare("
                SELECT bc.id, bc.name, bc.display_order, bc.parent_id
                FROM boq_categories bc
                WHERE bc.model_id = ? AND bc.is_option = FALSE
                ORDER BY bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $categories = $stmt->fetchAll();
            $lineStmt = $sdb->prepare("
                SELECT id, description FROM boq_lines
                WHERE category_id = ? ORDER BY description ASC
            ");
            foreach ($categories as &$cat) {
                $cat['id']         = (int)$cat['id'];
                $cat['parent_id']  = $cat['parent_id'] ? (int)$cat['parent_id'] : null;
                $cat['display_order'] = (int)$cat['display_order'];
                $lineStmt->execute([$cat['id']]);
                $cat['lines'] = $lineStmt->fetchAll();
            }
            ok($categories);
            break;
        }

        case 'get_boq_category_lines': {
            $categoryId = (int)($body['category_id'] ?? 0);
            if ($categoryId <= 0) fail('category_id manquant');
            $sdb = getSunboxDB();

            // Return direct lines of this category AND lines of its sub-categories,
            // tagged with sub_category_name so the frontend can group them.
            $stmt = $sdb->prepare("
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

        case 'get_pool_boq_full': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail('model_id manquant');
            $sdb  = getSunboxDB();
            $stmt = $sdb->prepare("
                SELECT bc.id, bc.name, bc.is_option, bc.qty_editable, bc.display_order, bc.parent_id
                FROM boq_categories bc
                WHERE bc.model_id = ?
                ORDER BY bc.display_order ASC, bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $categories = $stmt->fetchAll();
            $lineStmt   = $sdb->prepare("
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
                $cat['id']         = (int)$cat['id'];
                $cat['is_option']  = (bool)$cat['is_option'];
                $cat['qty_editable'] = (bool)($cat['qty_editable'] ?? false);
                $cat['parent_id']  = $cat['parent_id'] ? (int)$cat['parent_id'] : null;
                $cat['display_order'] = (int)$cat['display_order'];
                $lineStmt->execute([$cat['id']]);
                $lines = $lineStmt->fetchAll();
                foreach ($lines as &$ln) {
                    $ln['id']            = (int)$ln['id'];
                    $ln['quantity']      = (float)$ln['quantity'];
                    $ln['unit_cost_ht']  = (float)$ln['unit_cost_ht'];
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

        case 'get_model_boq_price': {
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail('model_id manquant');
            $sdb      = getSunboxDB();
            $mStmt    = $sdb->prepare("SELECT unforeseen_cost_percent FROM models WHERE id = ?");
            $mStmt->execute([$modelId]);
            $mRow     = $mStmt->fetch();
            $unforeseen = (float)($mRow['unforeseen_cost_percent'] ?? 10);
            $stmt = $sdb->prepare("
                SELECT
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS base_price_ht,
                    COALESCE(SUM(ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht), 2)), 0) AS total_cost_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
                WHERE bc.model_id = ? AND bc.is_option = FALSE
            ");
            $stmt->execute([$modelId]);
            $res          = $stmt->fetch();
            $basePriceHT  = (float)$res['base_price_ht'];
            $totalCostHT  = (float)$res['total_cost_ht'];
            ok([
                'model_id'                    => $modelId,
                'base_price_ht'               => $basePriceHT,
                'total_cost_ht'               => $totalCostHT,
                'profit_ht'                   => round($basePriceHT - $totalCostHT, 2),
                'unforeseen_cost_percent'      => $unforeseen,
                'base_price_ht_with_unforeseen' => round($basePriceHT * (1 + $unforeseen / 100), 2),
            ]);
            break;
        }

        case 'get_pool_boq_variables': {
            $sdb  = getSunboxDB();
            $stmt = $sdb->query("SELECT * FROM pool_boq_variables ORDER BY display_order ASC");
            ok($stmt->fetchAll());
            break;
        }

        case 'get_pool_boq_price_list': {
            $sdb  = getSunboxDB();
            $stmt = $sdb->query("
                SELECT pl.*, s.name AS supplier_name
                FROM pool_boq_price_list pl
                LEFT JOIN suppliers s ON pl.supplier_id = s.id
                ORDER BY pl.display_order ASC
            ");
            ok($stmt->fetchAll());
            break;
        }

        case 'update_setting': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['key', 'value']);
            $stmt = $db->prepare("
                INSERT INTO pro_settings (setting_key, setting_value, setting_group)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            $stmt->execute([$body['key'], $body['value'], $body['group'] ?? 'general']);
            ok();
            break;
        }

        // ── SITE SETTINGS (own DB) ─────────────────────────────────────────────
        case 'get_settings': {
            $db = getDB();
            $group = $body['group'] ?? ($_GET['group'] ?? '');
            if ($group) {
                $stmt = $db->prepare("SELECT setting_key, setting_value FROM pro_settings WHERE setting_group = ?");
                $stmt->execute([$group]);
            } else {
                $stmt = $db->query("SELECT setting_key, setting_value FROM pro_settings");
            }
            $rows = $stmt->fetchAll();
            $result = [];
            foreach ($rows as $row) $result[$row['setting_key']] = $row['setting_value'];
            ok($result);
            break;
        }

        case 'update_settings_bulk': {
            requireAdmin();
            $db = getDB();
            $items = $body['settings'] ?? $body;
            if (!is_array($items)) fail('Invalid settings format');
            $stmt = $db->prepare("
                INSERT INTO pro_settings (setting_key, setting_value, setting_group)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            foreach ($items as $item) {
                if (isset($item['key'])) {
                    $stmt->execute([$item['key'], $item['value'] ?? '', $item['group'] ?? 'general']);
                }
            }
            ok();
            break;
        }

        // ── CONTACTS (own DB) ──────────────────────────────────────────────────
        case 'get_contacts': {
            requireAdmin();
            $db = getDB();
            $stmt = $db->query("
                SELECT c.*,
                    'new' AS status,
                    (SELECT COUNT(*) FROM pro_quotes WHERE customer_email = c.email) AS quote_count,
                    (SELECT COALESCE(SUM(total_price),0) FROM pro_quotes WHERE customer_email = c.email AND status IN ('approved','completed')) AS total_revenue
                FROM pro_contacts c
                ORDER BY c.name ASC
            ");
            ok($stmt->fetchAll());
            break;
        }

        case 'get_contact': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            $stmt = $db->prepare("SELECT c.*, 'new' AS status FROM pro_contacts c WHERE c.id = ?");
            $stmt->execute([$id]);
            $contact = $stmt->fetch();
            if (!$contact) fail('Contact introuvable', 404);
            $qStmt = $db->prepare("
                SELECT id, reference_number, model_name, base_price, options_total, total_price, status, created_at, valid_until
                FROM pro_quotes
                WHERE customer_email = ?
                ORDER BY created_at DESC
            ");
            $qStmt->execute([$contact['email']]);
            $contact['quotes'] = $qStmt->fetchAll();
            ok($contact);
            break;
        }

        case 'create_contact': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['name']);
            $stmt = $db->prepare("
                INSERT INTO pro_contacts (name, email, phone, address, company)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$body['name'], $body['email'] ?? '', $body['phone'] ?? '', $body['address'] ?? '', $body['company'] ?? '']);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_contact': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            $sets = [];
            $params = [];
            foreach (['name', 'email', 'phone', 'address', 'company'] as $field) {
                if (array_key_exists($field, $body)) { $sets[] = "$field = ?"; $params[] = $body[$field]; }
            }
            if (!empty($sets)) {
                $params[] = $id;
                $db->prepare("UPDATE pro_contacts SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
            }
            ok();
            break;
        }

        case 'delete_contact': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM pro_contacts WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ── QUOTES (own DB) ────────────────────────────────────────────────────
        case 'get_quotes': {
            requireAdmin();
            $db = getDB();
            $stmt = $db->query("
                SELECT q.*, c.name AS contact_name, c.email AS contact_email,
                       (SELECT id FROM pro_purchase_reports WHERE quote_id = q.id ORDER BY id DESC LIMIT 1) AS purchase_report_id
                FROM pro_quotes q
                LEFT JOIN pro_contacts c ON c.id = q.contact_id
                ORDER BY q.created_at DESC
            ");
            ok($stmt->fetchAll());
            break;
        }

        case 'get_quote': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $stmt = $db->prepare("SELECT q.*, c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone FROM pro_quotes q LEFT JOIN pro_contacts c ON c.id = q.contact_id WHERE q.id = ?");
            $stmt->execute([(int)$body['id']]);
            $quote = $stmt->fetch();
            if (!$quote) fail('Devis introuvable', 404);
            ok($quote);
            break;
        }

        case 'get_quote_with_details': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $id = (int)$body['id'];

            $stmt = $db->prepare("
                SELECT q.*,
                       COALESCE(q.customer_name, c.name)    AS customer_name,
                       COALESCE(q.customer_email, c.email)  AS customer_email,
                       COALESCE(q.customer_phone, c.phone)  AS customer_phone,
                       COALESCE(q.customer_address, c.address) AS customer_address
                FROM pro_quotes q
                LEFT JOIN pro_contacts c ON c.id = q.contact_id
                WHERE q.id = ?
            ");
            $stmt->execute([$id]);
            $quote = $stmt->fetch();
            if (!$quote) fail('Devis introuvable', 404);

            // Pro quotes are never free-form quotes
            $quote['is_free_quote'] = false;

            $modelId = (int)($quote['model_id'] ?? 0);

            // ── Fallback: model photo/plan from Sunbox DB ───────────────────
            if ($modelId > 0) {
                try {
                    $sdb = getSunboxDB();
                    if (empty($quote['photo_url'])) {
                        $r = $sdb->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'photo' ORDER BY is_primary DESC, id DESC LIMIT 1");
                        $r->execute([$modelId]);
                        $row = $r->fetch();
                        if ($row) $quote['photo_url'] = sunboxAbsUrl('/' . ltrim($row['file_path'], '/'));
                    }
                    if (empty($quote['plan_url'])) {
                        $r = $sdb->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'plan' ORDER BY is_primary DESC, id DESC LIMIT 1");
                        $r->execute([$modelId]);
                        $row = $r->fetch();
                        if ($row) $quote['plan_url'] = sunboxAbsUrl('/' . ltrim($row['file_path'], '/'));
                    }
                } catch (\Throwable $e) { /* non-fatal */ }
            }

            // ── Selected options with BOQ detail lines ──────────────────────
            $options = [];
            try {
                $optStmt = $db->prepare("SELECT option_id, option_name, option_price FROM pro_quote_options WHERE quote_id = ? ORDER BY id ASC");
                $optStmt->execute([$id]);
                $proOpts = $optStmt->fetchAll();
                if (!empty($proOpts) && $modelId > 0) {
                    $sdb = getSunboxDB();
                    foreach ($proOpts as $opt) {
                        $details = '';
                        try {
                            $dStmt = $sdb->prepare("
                                SELECT GROUP_CONCAT(bl.description ORDER BY bl.display_order ASC, bl.id ASC SEPARATOR ', ') AS details
                                FROM boq_categories bc
                                LEFT JOIN boq_lines bl ON bl.category_id = bc.id
                                WHERE bc.model_id = ? AND bc.name = ? AND bc.is_option = TRUE
                                GROUP BY bc.id LIMIT 1
                            ");
                            $dStmt->execute([$modelId, $opt['option_name']]);
                            $row = $dStmt->fetch();
                            $details = $row['details'] ?? '';
                        } catch (\Throwable $e) { /* non-fatal */ }
                        $options[] = [
                            'option_id'      => $opt['option_id'],
                            'option_name'    => $opt['option_name'],
                            'option_price'   => (float)$opt['option_price'],
                            'option_details' => $details,
                        ];
                    }
                } else {
                    foreach ($proOpts as $opt) {
                        $options[] = ['option_id' => $opt['option_id'], 'option_name' => $opt['option_name'], 'option_price' => (float)$opt['option_price'], 'option_details' => ''];
                    }
                }
            } catch (\Throwable $e) { /* pro_quote_options table may not exist yet */ }
            $quote['options'] = $options;

            // ── Base categories from Sunbox BOQ ─────────────────────────────
            $baseCategories = [];
            if ($modelId > 0) {
                try {
                    $sdb = getSunboxDB();
                    $castLine = function(array $ln): array {
                        return ['description' => $ln['description'], 'quantity' => (float)$ln['quantity'], 'unit' => $ln['unit'],
                                'unit_cost_ht' => (float)$ln['unit_cost_ht'], 'margin_percent' => (float)$ln['margin_percent'],
                                'sale_price_ht' => (float)$ln['sale_price_ht']];
                    };
                    $sumLines = function(array $lines): float {
                        return round(array_sum(array_map(fn($ln) => (float)$ln['sale_price_ht'], $lines)), 2);
                    };
                    $topStmt = $sdb->prepare("SELECT bc.id, bc.name, bc.display_order FROM boq_categories bc WHERE bc.model_id = ? AND bc.is_option = FALSE AND bc.parent_id IS NULL ORDER BY bc.display_order ASC, bc.name ASC");
                    $topStmt->execute([$modelId]);
                    $topCats = $topStmt->fetchAll();
                    $subStmt = $sdb->prepare("SELECT bc.id, bc.name FROM boq_categories bc WHERE bc.model_id = ? AND bc.is_option = FALSE AND bc.parent_id = ? ORDER BY bc.display_order ASC, bc.name ASC");
                    $lineStmt = $sdb->prepare("SELECT bl.description, bl.quantity, bl.unit, COALESCE(pl.unit_price, bl.unit_cost_ht) AS unit_cost_ht, bl.margin_percent, ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2) AS sale_price_ht FROM boq_lines bl LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id WHERE bl.category_id = ? ORDER BY bl.display_order ASC, bl.id ASC");
                    foreach ($topCats as $topCat) {
                        $topId = (int)$topCat['id'];
                        $subStmt->execute([$modelId, $topId]);
                        $subCats = $subStmt->fetchAll();
                        if (!empty($subCats)) {
                            $subcats = []; $catTotal = 0.0;
                            foreach ($subCats as $sub) {
                                $lineStmt->execute([(int)$sub['id']]);
                                $rawLines = $lineStmt->fetchAll();
                                $subTotal = $sumLines($rawLines);
                                $catTotal += $subTotal;
                                $subcats[] = ['name' => $sub['name'], 'total_sale_price_ht' => $subTotal, 'lines' => array_map($castLine, $rawLines)];
                            }
                            $baseCategories[] = ['name' => $topCat['name'], 'total_sale_price_ht' => round($catTotal, 2), 'subcategories' => $subcats, 'lines' => []];
                        } else {
                            $lineStmt->execute([$topId]);
                            $rawLines = $lineStmt->fetchAll();
                            $baseCategories[] = ['name' => $topCat['name'], 'total_sale_price_ht' => $sumLines($rawLines), 'subcategories' => [], 'lines' => array_map($castLine, $rawLines)];
                        }
                    }
                } catch (\Throwable $e) { /* non-fatal */ }
            }
            $quote['base_categories'] = $baseCategories;

            // ── Encode photo/plan as base64 to avoid CORS issues on the pro site ──
            $sunboxRoot = dirname(__DIR__, 3); // public_html/
            $realBase = realpath($sunboxRoot) ?: $sunboxRoot;
            foreach (['photo' => 'photo_url', 'plan' => 'plan_url'] as $type => $urlKey) {
                $url = $quote[$urlKey] ?? '';
                if (!$url) continue;
                // Extract root-relative path from absolute URL (e.g. /uploads/models/x.jpg)
                $path = parse_url($url, PHP_URL_PATH);
                if ($path) {
                    // Guard against path traversal
                    $fullPath = realpath($sunboxRoot . '/' . ltrim($path, '/'));
                    if ($fullPath && strncmp($fullPath, $realBase, strlen($realBase)) === 0 && is_file($fullPath)) {
                        $mime = @mime_content_type($fullPath) ?: 'image/jpeg';
                        $quote[$type . '_base64'] = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($fullPath));
                    }
                }
            }

            ok($quote);
            break;
        }

        case 'get_pdf_context': {
            requireAdmin();
            // Read PDF styling settings (template, colors, etc.) from Sunbox DB.
            // Company info comes from the pro user's own professional_profiles row.
            // PDF content settings (footer, terms, bank) come from pro's own pro_settings,
            // falling back to auto-generated values from company info.
            $pdfSettings = [];
            $siteSettings = [];
            try {
                $sdb = getSunboxDB();
                $stmt = $sdb->query("SELECT setting_key, setting_value, setting_group FROM settings WHERE setting_group IN ('pdf','site','general')");
                foreach ($stmt->fetchAll() as $row) {
                    $k = $row['setting_key']; $v = $row['setting_value'];
                    $g = $row['setting_group'];
                    if ($g === 'pdf') {
                        $pdfSettings[$k] = $v;
                    } elseif ($g === 'site') {
                        $siteSettings[$k] = $v;
                    } elseif ($g === 'general' && !isset($pdfSettings[$k])) {
                        $pdfSettings[$k] = $v;
                    }
                }
            } catch (\Throwable $e) { /* non-fatal */ }

            // Use pro VAT rate from .env (overrides Sunbox general setting)
            $proVatRate = env('VAT_RATE', '');
            if ($proVatRate !== '') {
                $pdfSettings['vat_rate'] = $proVatRate;
            }

            // Build company info from this pro user's professional_profiles row
            $profile   = getProProfile();
            $proEmail  = '';
            if (SUNBOX_USER_ID) {
                try {
                    $sdb   = getSunboxDB();
                    $eStmt = $sdb->prepare("SELECT email FROM users WHERE id = ? LIMIT 1");
                    $eStmt->execute([SUNBOX_USER_ID]);
                    $proEmail = (string)($eStmt->fetchColumn() ?: '');
                } catch (\Throwable $e) { /* non-fatal */ }
            }
            $companySettings = [
                'company_name'    => (string)($profile['company_name'] ?? env('COMPANY_NAME', '')),
                'company_email'   => $proEmail,
                'company_phone'   => (string)($profile['phone'] ?? ''),
                'company_address' => (string)($profile['address'] ?? ''),
            ];

            // Override PDF content keys with pro's own pro_settings values if set
            $proContentKeys = ['pdf_footer_text', 'pdf_terms', 'pdf_bank_details',
                               'pdf_show_bank_details', 'pdf_show_terms', 'pdf_validity_days'];
            $proSettingsOverride = [];
            try {
                $db = getDB();
                $placeholders = implode(',', array_fill(0, count($proContentKeys), '?'));
                $pStmt = $db->prepare("SELECT setting_key, setting_value FROM pro_settings WHERE setting_key IN ($placeholders)");
                $pStmt->execute($proContentKeys);
                foreach ($pStmt->fetchAll() as $row) {
                    $proSettingsOverride[$row['setting_key']] = $row['setting_value'];
                }
            } catch (\Throwable $e) { /* non-fatal */ }

            foreach ($proSettingsOverride as $k => $v) {
                $pdfSettings[$k] = $v;
            }

            // If pro has not explicitly set pdf_footer_text, build it from company info
            // (this ensures the PDF never shows the Sunbox default footer)
            if (!isset($proSettingsOverride['pdf_footer_text'])) {
                $footerParts = array_values(array_filter([
                    $companySettings['company_name'],
                    $companySettings['company_address'],
                    $companySettings['company_email'],
                ]));
                $pdfSettings['pdf_footer_text'] = implode(' – ', $footerParts);
            }
            // Clear Sunbox-specific terms/bank details if the pro user hasn't set their own
            if (!isset($proSettingsOverride['pdf_terms'])) {
                $pdfSettings['pdf_terms'] = '';
            }
            if (!isset($proSettingsOverride['pdf_bank_details'])) {
                $pdfSettings['pdf_bank_details'] = '';
            }

            // Convert the pro user's logo to base64 (logo lives on the Sunbox server)
            $sunboxRoot = dirname(__DIR__, 3); // public_html/
            $realBase   = realpath($sunboxRoot) ?: $sunboxRoot;
            $logoBase64 = '';
            $logoUrl    = (string)($profile['logo_url'] ?? '');
            if ($logoUrl) {
                $logoPath = parse_url($logoUrl, PHP_URL_PATH);
                if ($logoPath) {
                    $fullPath = realpath($sunboxRoot . '/' . ltrim($logoPath, '/'));
                    if ($fullPath && strncmp($fullPath, $realBase, strlen($realBase)) === 0 && is_file($fullPath)) {
                        $mime = @mime_content_type($fullPath) ?: 'image/jpeg';
                        $logoBase64 = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($fullPath));
                    }
                }
            }

            ok([
                'pdf_settings'     => $pdfSettings,
                'company_settings' => $companySettings,
                'site_settings'    => $siteSettings,
                'logo_base64'      => $logoBase64,
            ]);
            break;
        }

        case 'get_contact_by_device': {
            $db = getDB();
            validateRequired($body, ['device_id']);
            $stmt = $db->prepare("
                SELECT id, name, email, phone, address
                FROM pro_contacts
                WHERE device_id = ?
                ORDER BY updated_at DESC
                LIMIT 1
            ");
            $stmt->execute([sanitize($body['device_id'])]);
            ok($stmt->fetch() ?: null);
            break;
        }

        case 'create_quote': {
            // Public — visitor submitting a quote from the configurator (no admin auth required)
            $db = getDB();
            validateRequired($body, ['model_id', 'model_name', 'model_type', 'base_price', 'total_price',
                                     'customer_name', 'customer_email', 'customer_phone']);

            // Deduct 500 Rs credits from Sunbox for each quote created
            $creditResult = deductCredits(500, 'quote_created');
            if (!($creditResult['success'] ?? false)) {
                fail($creditResult['error'] ?? 'Crédits insuffisants', 402);
            }

            $db->beginTransaction();
            try {
                $yearMonth  = date('Ym');
                $modelType  = $body['model_type'];
                $refPrefix  = ($modelType === 'container') ? 'PCQ' : 'PPQ';
                $maxNext    = (int)$db->query("SELECT COALESCE(MAX(id),0)+1 FROM pro_quotes")->fetchColumn();
                $reference  = sprintf('%s-%s-%06d', $refPrefix, $yearMonth, $maxNext);
                $validUntil = date('Y-m-d', strtotime('+30 days'));

                $customerEmail   = sanitize($body['customer_email']);
                $customerName    = sanitize($body['customer_name']);
                $customerPhone   = sanitize($body['customer_phone']);
                $customerAddress = sanitize($body['customer_address'] ?? '');
                $deviceId        = isset($body['device_id']) ? sanitize($body['device_id']) : null;

                // Create or update pro_contacts
                $cStmt = $db->prepare("SELECT id FROM pro_contacts WHERE email = ?");
                $cStmt->execute([$customerEmail]);
                $existing = $cStmt->fetch();
                if ($existing) {
                    $contactId = $existing['id'];
                    $db->prepare("UPDATE pro_contacts SET name=?, phone=?, address=?,
                                  device_id=COALESCE(?,device_id), updated_at=NOW() WHERE id=?")
                       ->execute([$customerName, $customerPhone, $customerAddress, $deviceId, $contactId]);
                } else {
                    $db->prepare("INSERT INTO pro_contacts (name,email,phone,address,device_id) VALUES (?,?,?,?,?)")
                       ->execute([$customerName, $customerEmail, $customerPhone, $customerAddress, $deviceId]);
                    $contactId = (int)$db->lastInsertId();
                }

                // Insert quote (try with pool dimension columns first; fall back if migration not applied)
                $nullFloat = fn($k) => isset($body[$k]) && $body[$k] !== null ? (float)$body[$k] : null;
                $proInserted = false;
                try {
                    $db->prepare("
                        INSERT INTO pro_quotes
                            (reference_number, contact_id, customer_name, customer_email, customer_phone,
                             customer_address, customer_message, model_id, model_name, model_type,
                             base_price, options_total, total_price, status, valid_until,
                             pool_shape,
                             pool_longueur, pool_largeur, pool_profondeur,
                             pool_longueur_la, pool_largeur_la, pool_profondeur_la,
                             pool_longueur_lb, pool_largeur_lb, pool_profondeur_lb,
                             pool_longueur_ta, pool_largeur_ta, pool_profondeur_ta,
                             pool_longueur_tb, pool_largeur_tb, pool_profondeur_tb)
                        VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?,'pending',?,
                                ?, ?,?,?, ?,?,?, ?,?,?, ?,?,?, ?,?,?)
                    ")->execute([
                        $reference,
                        $contactId,
                        $customerName, $customerEmail, $customerPhone,
                        $customerAddress,
                        sanitize($body['customer_message'] ?? ''),
                        (int)$body['model_id'],
                        sanitize($body['model_name']),
                        $modelType,
                        (float)$body['base_price'],
                        (float)($body['options_total'] ?? 0),
                        (float)$body['total_price'],
                        $validUntil,
                        isset($body['pool_shape']) ? sanitize($body['pool_shape']) : null,
                        $nullFloat('pool_longueur'),    $nullFloat('pool_largeur'),    $nullFloat('pool_profondeur'),
                        $nullFloat('pool_longueur_la'), $nullFloat('pool_largeur_la'), $nullFloat('pool_profondeur_la'),
                        $nullFloat('pool_longueur_lb'), $nullFloat('pool_largeur_lb'), $nullFloat('pool_profondeur_lb'),
                        $nullFloat('pool_longueur_ta'), $nullFloat('pool_largeur_ta'), $nullFloat('pool_profondeur_ta'),
                        $nullFloat('pool_longueur_tb'), $nullFloat('pool_largeur_tb'), $nullFloat('pool_profondeur_tb'),
                    ]);
                    $proInserted = true;
                } catch (PDOException $dimEx) { /* pool dimension columns not yet added – fall through */ }

                if (!$proInserted) {
                    $db->prepare("
                        INSERT INTO pro_quotes
                            (reference_number, contact_id, customer_name, customer_email, customer_phone,
                             customer_address, customer_message, model_id, model_name, model_type,
                             base_price, options_total, total_price, status, valid_until)
                        VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?,'pending',?)
                    ")->execute([
                        $reference,
                        $contactId,
                        $customerName, $customerEmail, $customerPhone,
                        $customerAddress,
                        sanitize($body['customer_message'] ?? ''),
                        (int)$body['model_id'],
                        sanitize($body['model_name']),
                        $modelType,
                        (float)$body['base_price'],
                        (float)($body['options_total'] ?? 0),
                        (float)$body['total_price'],
                        $validUntil,
                    ]);
                }
                $quoteId = (int)$db->lastInsertId();

                // Update reference with actual quote ID for uniqueness guarantee
                $reference = sprintf('%s-%s-%06d', $refPrefix, $yearMonth, $quoteId);
                $db->prepare("UPDATE pro_quotes SET reference_number=? WHERE id=?")->execute([$reference, $quoteId]);

                // Store selected options in pro_quote_options
                if (!empty($body['selected_options']) && is_array($body['selected_options'])) {
                    $oStmt = $db->prepare("INSERT INTO pro_quote_options
                                           (quote_id, option_id, option_name, option_price)
                                           VALUES (?,?,?,?)");
                    $OFFSET = 1000000;
                    foreach ($body['selected_options'] as $opt) {
                        $oid = (int)($opt['option_id'] ?? 0);
                        $oStmt->execute([
                            $quoteId,
                            $oid >= $OFFSET ? null : $oid,
                            sanitize($opt['option_name']),
                            (float)$opt['option_price'],
                        ]);
                    }
                }

                $db->commit();
                ok(['id' => $quoteId, 'reference_number' => $reference, 'contact_id' => $contactId,
                    'credits_after' => $creditResult['data']['credits'] ?? null]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'update_quote_status': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id', 'status']);
            $id     = (int)$body['id'];
            $status = $body['status'];

            // Deduct validation credits only when SUNBOX_USER_ID is properly configured
            if ($status === 'approved' && SUNBOX_USER_ID > 0) {
                $creditResult = deductCredits(1000, 'quote_validated', $id);
                if (!($creditResult['success'] ?? false)) {
                    fail($creditResult['error'] ?? 'Crédits insuffisants', 402);
                }
            }

            $db->prepare("UPDATE pro_quotes SET status = ?, updated_at = NOW() WHERE id = ?")->execute([$status, $id]);
            ok();
            break;
        }

        case 'update_quote': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            $sets = []; $params = [];
            if (array_key_exists('customer_name', $body))    { $sets[] = 'customer_name = ?';    $params[] = sanitize((string)$body['customer_name']); }
            if (array_key_exists('customer_email', $body))   { $sets[] = 'customer_email = ?';   $params[] = sanitize((string)$body['customer_email']); }
            if (array_key_exists('customer_phone', $body))   { $sets[] = 'customer_phone = ?';   $params[] = sanitize((string)$body['customer_phone']); }
            if (array_key_exists('customer_address', $body)) { $sets[] = 'customer_address = ?'; $params[] = sanitize((string)$body['customer_address']); }
            if (array_key_exists('customer_message', $body)) { $sets[] = 'customer_message = ?'; $params[] = sanitize((string)$body['customer_message']); }
            if (!empty($sets)) {
                $sets[] = 'updated_at = NOW()';
                $params[] = $id;
                $db->prepare("UPDATE pro_quotes SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
            }
            ok();
            break;
        }

        case 'delete_quote': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $qid = (int)$body['id'];
            // Cascade: delete purchase report items and reports linked to this quote
            try {
                $rStmt = $db->prepare("SELECT id FROM pro_purchase_reports WHERE quote_id = ?");
                $rStmt->execute([$qid]);
                $reportIds = $rStmt->fetchAll(\PDO::FETCH_COLUMN);
                if (!empty($reportIds)) {
                    $placeholders = implode(',', array_fill(0, count($reportIds), '?'));
                    $db->prepare("DELETE FROM pro_purchase_report_items WHERE report_id IN ($placeholders)")->execute($reportIds);
                    $db->prepare("DELETE FROM pro_purchase_reports WHERE id IN ($placeholders)")->execute($reportIds);
                }
            } catch (\PDOException $e) { error_log('delete_quote cascade error: ' . $e->getMessage()); }
            $db->prepare("DELETE FROM pro_quotes WHERE id = ?")->execute([$qid]);
            ok();
            break;
        }

        // ── PURCHASE REPORTS (Rapport d'Achat) ────────────────────────────────
        case 'request_boq_report': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['quote_id']);
            $quoteId = (int)$body['quote_id'];

            $qStmt = $db->prepare("SELECT * FROM pro_quotes WHERE id = ?");
            $qStmt->execute([$quoteId]);
            $quote = $qStmt->fetch();
            if (!$quote) fail('Devis introuvable', 404);

            // Idempotent: if already requested, return existing report id
            if (!empty($quote['boq_requested'])) {
                $rStmt = $db->prepare("SELECT id FROM pro_purchase_reports WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1");
                $rStmt->execute([$quoteId]);
                $existing = $rStmt->fetch();
                if ($existing) { ok(['report_id' => (int)$existing['id'], 'already_exists' => true]); break; }
            }

            // Deduct 1 500 Rs ('boq_requested' is the allowed reason in deductCredits)
            $creditResult = deductCredits(1500, 'boq_requested', $quoteId);
            if (!($creditResult['success'] ?? false)) {
                fail($creditResult['error'] ?? 'Crédits insuffisants', 402);
            }

            // Fetch base BOQ lines from Sunbox DB.
            // Try with replace_with_sunbox column first; fall back if Sunbox DB not yet upgraded.
            $sdb = getSunboxDB();

            // Helper: build supplier_name expression (with or without replace_with_sunbox column)
            $supplierExpr     = "IF(COALESCE(s.replace_with_sunbox,0)=1,'Sunbox',COALESCE(s.name,'Fournisseur non défini'))";
            $supplierExprFb   = "COALESCE(s.name,'Fournisseur non défini')";   // fallback (column missing)

            $boqSqlTpl = "
                SELECT bc.name AS category_name,
                       bl.description, bl.quantity, bl.unit, bl.margin_percent,
                       COALESCE(pl.unit_price, bl.unit_cost_ht) AS unit_price,
                       ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht), 2) AS total_price,
                       %s AS supplier_name,
                       bc.display_order AS cat_order, bl.display_order AS line_order
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bl.category_id = bc.id
                LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
                LEFT JOIN suppliers s ON bl.supplier_id = s.id
                WHERE bc.model_id = ? AND bc.is_option = %s AND bl.id IS NOT NULL
                ORDER BY COALESCE(s.name,'Fournisseur non défini'), bc.display_order, bl.display_order
            ";

            // Execute a BOQ query with graceful column-missing fallback
            $execBoqQuery = function(\PDO $pdo, string $sexpr, string $sexprFb, string $tpl, string $isOpt, array $params) {
                $sql = sprintf($tpl, $sexpr, $isOpt);
                try {
                    $st = $pdo->prepare($sql);
                    $st->execute($params);
                    return $st->fetchAll();
                } catch (\Throwable $e) {
                    // Unknown column 'replace_with_sunbox' — retry with plain supplier name
                    if (false !== stripos($e->getMessage(), 'replace_with_sunbox')) {
                        $st = $pdo->prepare(sprintf($tpl, $sexprFb, $isOpt));
                        $st->execute($params);
                        return $st->fetchAll();
                    }
                    throw $e;
                }
            };

            $lines = $execBoqQuery($sdb, $supplierExpr, $supplierExprFb, $boqSqlTpl, 'FALSE', [(int)$quote['model_id']]);

            // Fetch option BOQ lines for the options actually selected in this quote
            $optionLines = [];
            try {
                $selOptStmt = $db->prepare(
                    "SELECT DISTINCT option_name FROM pro_quote_options WHERE quote_id = ? AND option_name IS NOT NULL AND option_name != ''"
                );
                $selOptStmt->execute([$quoteId]);
                $selectedOptionNames = array_column($selOptStmt->fetchAll(), 'option_name');

                if (!empty($selectedOptionNames)) {
                    $ph = implode(',', array_fill(0, count($selectedOptionNames), '?'));
                    $optTpl = "
                        SELECT bc.name AS category_name,
                               bl.description, bl.quantity, bl.unit, bl.margin_percent,
                               COALESCE(pl.unit_price, bl.unit_cost_ht) AS unit_price,
                               ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht), 2) AS total_price,
                               %s AS supplier_name,
                               bc.display_order AS cat_order, bl.display_order AS line_order
                        FROM boq_categories bc
                        LEFT JOIN boq_lines bl ON bl.category_id = bc.id
                        LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
                        LEFT JOIN suppliers s ON bl.supplier_id = s.id
                        WHERE bc.model_id = ? AND bc.is_option = TRUE AND bc.name IN ($ph) AND bl.id IS NOT NULL
                        ORDER BY COALESCE(s.name,'Fournisseur non défini'), bc.display_order, bl.display_order
                    ";
                    $params = array_merge([(int)$quote['model_id']], $selectedOptionNames);
                    try {
                        $st = $sdb->prepare(sprintf($optTpl, $supplierExpr));
                        $st->execute($params);
                        $optionLines = $st->fetchAll();
                    } catch (\Throwable $e) {
                        if (false !== stripos($e->getMessage(), 'replace_with_sunbox')) {
                            $st = $sdb->prepare(sprintf($optTpl, $supplierExprFb));
                            $st->execute($params);
                            $optionLines = $st->fetchAll();
                        } else { throw $e; }
                    }
                }
            } catch (\Throwable $ignored) {
                // pro_quote_options table may not exist yet; skip option items gracefully
            }

            $totalBase    = (float)array_sum(array_column($lines, 'total_price'));
            $totalOptions = (float)array_sum(array_column($optionLines, 'total_price'));
            $totalAmount  = $totalBase + $totalOptions;

            $db->beginTransaction();
            try {
                $db->prepare("INSERT INTO pro_purchase_reports (quote_id, quote_reference, model_name, status, total_amount) VALUES (?,?,?,?,?)")
                   ->execute([$quoteId, $quote['reference_number'], $quote['model_name'], 'in_progress', $totalAmount]);
                $reportId = (int)$db->lastInsertId();

                $iStmt = $db->prepare("INSERT INTO pro_purchase_report_items
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

                $db->prepare("UPDATE pro_quotes SET boq_requested = 1 WHERE id = ?")->execute([$quoteId]);
                $db->commit();
                ok(['report_id' => $reportId]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'get_purchase_reports': {
            requireAdmin();
            $db   = getDB();
            $rows = $db->query("
                SELECT r.*, q.customer_name
                FROM pro_purchase_reports r
                LEFT JOIN pro_quotes q ON q.id = r.quote_id
                ORDER BY r.created_at DESC
            ")->fetchAll();
            foreach ($rows as &$r) { $r['total_amount'] = (float)$r['total_amount']; }
            ok($rows);
            break;
        }

        case 'get_purchase_report': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $rStmt = $db->prepare("
                SELECT r.*,
                       q.customer_name, q.customer_email, q.customer_phone,
                       q.base_price AS quote_base_price_ht,
                       q.options_total AS quote_options_ht,
                       q.total_price AS quote_total_ht
                FROM pro_purchase_reports r
                LEFT JOIN pro_quotes q ON q.id = r.quote_id
                WHERE r.id = ?
            ");
            $rStmt->execute([(int)$body['id']]);
            $report = $rStmt->fetch();
            if (!$report) fail('Rapport introuvable', 404);

            $vatRate = (float)env('VAT_RATE', 15);
            $report['vat_rate']            = $vatRate;
            $report['quote_base_price_ht'] = (float)($report['quote_base_price_ht'] ?? 0);
            $report['quote_options_ht']    = (float)($report['quote_options_ht'] ?? 0);
            $report['quote_total_ht']      = (float)($report['quote_total_ht'] ?? 0);
            $report['quote_base_price_ttc']= round($report['quote_base_price_ht'] * (1 + $vatRate / 100), 2);
            $report['quote_options_ttc']   = round($report['quote_options_ht']    * (1 + $vatRate / 100), 2);
            $report['quote_total_ttc']     = round($report['quote_total_ht']      * (1 + $vatRate / 100), 2);

            $iStmt = $db->prepare("SELECT * FROM pro_purchase_report_items WHERE report_id = ? ORDER BY is_option ASC, supplier_name, display_order");
            $iStmt->execute([(int)$body['id']]);
            $items = $iStmt->fetchAll();

            // Build a set of supplier names to replace with "Sunbox" at read time.
            // This fixes both old reports (stored real name) and handles the case where the
            // Sunbox DB hasn't been upgraded to v2.3.0 yet (replace_with_sunbox column missing).
            $sunboxReplacedNames = [];
            $replaceError = null;
            try {
                $sdb = getSunboxDB();
                // Try with the replace_with_sunbox column; fall back gracefully if missing.
                try {
                    $rStmt = $sdb->query("SELECT name FROM suppliers WHERE COALESCE(replace_with_sunbox,0) = 1");
                    foreach ($rStmt->fetchAll() as $row) {
                        // Trim whitespace to handle any DB encoding differences
                        $sunboxReplacedNames[trim((string)$row['name'])] = true;
                    }
                } catch (\Throwable $e2) {
                    $replaceError = 'suppliers query: ' . $e2->getMessage();
                }
            } catch (\Throwable $e1) {
                $replaceError = 'getSunboxDB: ' . $e1->getMessage();
            }

            $buckets       = ['base' => [], 'option' => []];
            $totalAmountHT = 0.0;
            foreach ($items as $item) {
                // Apply live "replace_with_sunbox" substitution — fixes old reports stored before the flag was added
                $rawName = trim((string)($item['supplier_name'] ?? ''));
                $sName   = isset($sunboxReplacedNames[$rawName]) ? 'Sunbox' : $rawName;
                $bucket = ($item['is_option'] ?? 0) ? 'option' : 'base';
                if (!isset($buckets[$bucket][$sName])) {
                    $buckets[$bucket][$sName] = ['supplier_name' => $sName, 'items' => [], 'subtotal_ht' => 0.0, 'subtotal_ttc' => 0.0];
                }
                $item['is_ordered']       = (bool)$item['is_ordered'];
                $item['is_option']        = (bool)($item['is_option'] ?? false);
                $item['quantity']         = (float)$item['quantity'];
                $item['unit_price_ht']    = (float)$item['unit_price'];
                $item['unit_price_ttc']   = round($item['unit_price_ht'] * (1 + $vatRate / 100), 2);
                $item['total_price_ht']   = round($item['unit_price_ht'] * $item['quantity'], 2);
                $item['total_price_ttc']  = round($item['total_price_ht'] * (1 + $vatRate / 100), 2);
                $item['unit_price']       = $item['unit_price_ht'];
                $item['total_price']      = $item['total_price_ht'];
                $buckets[$bucket][$sName]['items'][]       = $item;
                $buckets[$bucket][$sName]['subtotal_ht']  += $item['total_price_ht'];
                $buckets[$bucket][$sName]['subtotal_ttc'] += $item['total_price_ttc'];
                $buckets[$bucket][$sName]['subtotal']      = $buckets[$bucket][$sName]['subtotal_ht'];
                $totalAmountHT += $item['total_price_ht'];
            }
            $report['base_groups']      = array_values($buckets['base']);
            $report['option_groups']    = array_values($buckets['option']);
            $report['total_amount_ht']  = round($totalAmountHT, 2);
            $report['total_amount_ttc'] = round($totalAmountHT * (1 + $vatRate / 100), 2);
            $report['total_amount']     = $report['total_amount_ht'];
            if ($replaceError !== null && API_DEBUG) {
                $report['_replace_error'] = $replaceError;
            }
            ok($report);
            break;
        }

        case 'toggle_report_item': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $db->prepare("UPDATE pro_purchase_report_items SET is_ordered = NOT is_ordered WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        case 'update_report_status': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id', 'status']);
            $db->prepare("UPDATE pro_purchase_reports SET status = ?, updated_at = NOW() WHERE id = ?")->execute([$body['status'], (int)$body['id']]);
            ok();
            break;
        }

        case 'delete_purchase_report': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            // Get the quote_id so we can reset boq_requested = 0 (allows re-generation)
            $rStmt = $db->prepare("SELECT quote_id FROM pro_purchase_reports WHERE id = ?");
            $rStmt->execute([(int)$body['id']]);
            $row = $rStmt->fetch();
            // CASCADE FK deletes items automatically
            $db->prepare("DELETE FROM pro_purchase_reports WHERE id = ?")->execute([(int)$body['id']]);
            if ($row) {
                // Reset flag so the quote can have a new report generated
                $db->prepare("UPDATE pro_quotes SET boq_requested = 0 WHERE id = ?")->execute([(int)$row['quote_id']]);
            }
            ok();
            break;
        }

        case 'get_discounts': {
            requireAdmin();
            $db = getDB();
            $rows = $db->query("SELECT * FROM pro_discounts ORDER BY created_at DESC")->fetchAll();
            foreach ($rows as &$r) {
                $r['is_active'] = (bool)$r['is_active'];
                $r['model_ids'] = isset($r['model_ids']) && $r['model_ids'] ? json_decode($r['model_ids'], true) : [];
            }
            ok($rows);
            break;
        }

        case 'get_active_discounts': {
            $db = getDB();
            $rows = $db->query("SELECT * FROM pro_discounts WHERE is_active = 1 AND (end_date IS NULL OR end_date >= CURDATE()) ORDER BY start_date ASC")->fetchAll();
            foreach ($rows as &$r) {
                $r['is_active'] = (bool)$r['is_active'];
                $r['model_ids'] = isset($r['model_ids']) && $r['model_ids'] ? json_decode($r['model_ids'], true) : [];
            }
            ok($rows);
            break;
        }

        case 'create_discount': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['name', 'discount_type', 'discount_value', 'apply_to', 'start_date', 'end_date']);
            $modelIds = isset($body['model_ids']) ? json_encode($body['model_ids']) : null;
            $stmt = $db->prepare("
                INSERT INTO pro_discounts (name, description, discount_type, discount_value, apply_to, start_date, end_date, is_active, model_ids)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $body['name'], $body['description'] ?? '', $body['discount_type'],
                (float)$body['discount_value'], $body['apply_to'],
                $body['start_date'], $body['end_date'],
                isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1,
                $modelIds,
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_discount': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            $sets = []; $params = [];
            foreach (['name', 'description', 'discount_type', 'discount_value', 'apply_to', 'start_date', 'end_date'] as $f) {
                if (array_key_exists($f, $body)) { $sets[] = "$f = ?"; $params[] = $body[$f]; }
            }
            if (array_key_exists('is_active', $body)) { $sets[] = 'is_active = ?'; $params[] = (int)(bool)$body['is_active']; }
            if (array_key_exists('model_ids', $body)) { $sets[] = 'model_ids = ?'; $params[] = json_encode($body['model_ids']); }
            if (!empty($sets)) { $params[] = $id; $db->prepare("UPDATE pro_discounts SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params); }
            ok();
            break;
        }

        case 'delete_discount': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM pro_discounts WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ── EMAIL TEMPLATES (own DB) ───────────────────────────────────────────
        case 'get_email_templates': {
            requireAdmin();
            $db = getDB();
            $rows = $db->query("SELECT * FROM pro_email_templates ORDER BY template_type ASC, name ASC")->fetchAll();
            foreach ($rows as &$r) { $r['is_active'] = (bool)$r['is_active']; $r['is_default'] = (bool)$r['is_default']; }
            ok($rows);
            break;
        }

        case 'create_email_template': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['template_key', 'template_type', 'name', 'subject', 'body_html']);
            $stmt = $db->prepare("
                INSERT INTO pro_email_templates (template_key, template_type, name, subject, body_html, is_active, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$body['template_key'], $body['template_type'], $body['name'], $body['subject'], $body['body_html'], 1, 0]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_email_template': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            $sets = []; $params = [];
            foreach (['name', 'subject', 'body_html'] as $f) {
                if (array_key_exists($f, $body)) { $sets[] = "$f = ?"; $params[] = $body[$f]; }
            }
            if (array_key_exists('is_active', $body)) { $sets[] = 'is_active = ?'; $params[] = (int)(bool)$body['is_active']; }
            if (!empty($sets)) { $params[] = $id; $db->prepare("UPDATE pro_email_templates SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params); }
            ok();
            break;
        }

        case 'delete_email_template': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM pro_email_templates WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ── EMAIL SIGNATURES (own DB) ──────────────────────────────────────────
        case 'get_email_signatures': {
            requireAdmin();
            $db = getDB();
            $rows = $db->query("SELECT * FROM pro_email_signatures ORDER BY is_default DESC, name ASC")->fetchAll();
            foreach ($rows as &$r) { $r['is_active'] = (bool)$r['is_active']; $r['is_default'] = (bool)$r['is_default']; }
            ok($rows);
            break;
        }

        case 'create_email_signature': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['signature_key', 'name', 'body_html']);
            $stmt = $db->prepare("
                INSERT INTO pro_email_signatures (signature_key, name, description, body_html, logo_url, photo_url, is_active, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$body['signature_key'], $body['name'], $body['description'] ?? '', $body['body_html'],
                $body['logo_url'] ?? '', $body['photo_url'] ?? '', 1, 0]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_email_signature': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['signature_key']);
            $key = $body['signature_key'];
            $sets = []; $params = [];
            foreach (['name', 'description', 'body_html', 'logo_url', 'photo_url'] as $f) {
                if (array_key_exists($f, $body)) { $sets[] = "$f = ?"; $params[] = $body[$f]; }
            }
            foreach (['is_active', 'is_default'] as $f) {
                if (array_key_exists($f, $body)) { $sets[] = "$f = ?"; $params[] = (int)(bool)$body[$f]; }
            }
            if (!empty($sets)) { $params[] = $key; $db->prepare("UPDATE pro_email_signatures SET " . implode(', ', $sets) . " WHERE signature_key = ?")->execute($params); }
            ok();
            break;
        }

        case 'delete_email_signature': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['signature_key']);
            $db->prepare("DELETE FROM pro_email_signatures WHERE signature_key = ?")->execute([$body['signature_key']]);
            ok();
            break;
        }

        case 'get_email_logs': {
            requireAdmin();
            ok([]);
            break;
        }

        case 'test_email_config':
        case 'test_email_settings': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['to']);
            $settingsStmt = $db->query("SELECT setting_key, setting_value FROM pro_settings WHERE setting_group = 'email'");
            $s = [];
            foreach ($settingsStmt->fetchAll() as $row) $s[$row['setting_key']] = $row['setting_value'];
            $host   = $s['smtp_host'] ?? '';
            $port   = (int)($s['smtp_port'] ?? 587);
            $user   = $s['smtp_user'] ?? '';
            $secure = strtolower($s['smtp_secure'] ?? 'tls');
            if (!$host || !$user) fail('SMTP non configuré. Enregistrez d\'abord les paramètres Email.');
            // Tests TCP connectivity only — does NOT verify SMTP credentials or send email.
            // A successful response confirms the host/port are reachable from this server.
            $errno = 0; $errstr = '';
            $prefix = $secure === 'ssl' ? 'ssl://' : '';
            $conn = @fsockopen($prefix . $host, $port, $errno, $errstr, 5);
            if (!$conn) fail("Connexion SMTP échouée: $errstr (port $port)", 503);
            fclose($conn);
            ok(['message' => "Connexion TCP vers $host:$port réussie. (Test de connectivité uniquement — les identifiants ne sont pas vérifiés ici.)"]);
            break;
        }

        // ── DASHBOARD STATS ────────────────────────────────────────────────────
        case 'get_dashboard_stats': {
            requireAdmin();
            $db = getDB();
            $totalQuotes   = (int)$db->query("SELECT COUNT(*) FROM pro_quotes")->fetchColumn();
            $pendingQuotes = (int)$db->query("SELECT COUNT(*) FROM pro_quotes WHERE status = 'pending'")->fetchColumn();
            $approvedQuotes = (int)$db->query("SELECT COUNT(*) FROM pro_quotes WHERE status = 'approved'")->fetchColumn();
            $totalRevenue  = (float)$db->query("SELECT COALESCE(SUM(total_price),0) FROM pro_quotes WHERE status IN ('approved','completed')")->fetchColumn();
            $totalContacts = (int)$db->query("SELECT COUNT(*) FROM pro_contacts")->fetchColumn();

            $credits = checkCredits();

            $recentStmt = $db->query("
                SELECT q.*, c.name AS customer_name FROM pro_quotes q
                LEFT JOIN pro_contacts c ON c.id = q.contact_id
                ORDER BY q.created_at DESC LIMIT 5
            ");

            ok([
                'total_quotes'   => $totalQuotes,
                'pending_quotes' => $pendingQuotes,
                'approved_quotes' => $approvedQuotes,
                'total_revenue'  => $totalRevenue,
                'total_contacts' => $totalContacts,
                'credits'        => $credits['credits'],
                'catalog_mode'   => $credits['catalog_mode'],
                'recent_quotes'  => $recentStmt->fetchAll(),
            ]);
            break;
        }

        // ── CREDITS (direct from Sunbox DB — no HTTP) ─────────────────────────
        case 'get_pro_profile': {
            requireAdmin();
            $profile = getProProfile();
            $email   = '';
            if (SUNBOX_USER_ID) {
                try {
                    $sdb   = getSunboxDB();
                    $eStmt = $sdb->prepare("SELECT email FROM users WHERE id = ? LIMIT 1");
                    $eStmt->execute([SUNBOX_USER_ID]);
                    $email = (string)($eStmt->fetchColumn() ?: '');
                } catch (\Throwable $e) { /* non-fatal */ }
            }
            ok(array_merge($profile, [
                'id'                    => SUNBOX_USER_ID,
                'name'                  => (string)($profile['user_name'] ?? ''),
                'email'                 => $email,
                'credits'               => (float)($profile['credits'] ?? 0),
                'sunbox_margin_percent' => (float)($profile['sunbox_margin_percent'] ?? 0),
            ]));
            break;
        }

        case 'update_pro_profile': {
            requireAdmin();
            if (!SUNBOX_USER_ID) { fail('User non configuré', 400); }
            $sets = []; $params = [];
            if (array_key_exists('company_name', $body))         { $sets[] = 'company_name = ?';         $params[] = sanitize((string)$body['company_name']); }
            if (array_key_exists('address', $body))              { $sets[] = 'address = ?';              $params[] = sanitize((string)$body['address']); }
            if (array_key_exists('vat_number', $body))           { $sets[] = 'vat_number = ?';           $params[] = sanitize((string)$body['vat_number']); }
            if (array_key_exists('brn_number', $body))           { $sets[] = 'brn_number = ?';           $params[] = sanitize((string)$body['brn_number']); }
            if (array_key_exists('phone', $body))                { $sets[] = 'phone = ?';                $params[] = sanitize((string)$body['phone']); }
            if (array_key_exists('sunbox_margin_percent', $body)){ $sets[] = 'sunbox_margin_percent = ?'; $params[] = (float)$body['sunbox_margin_percent']; }
            if (array_key_exists('logo_url', $body)) {
                // Only accept root-relative paths (no arbitrary external URLs)
                $rawLogo = (string)$body['logo_url'];
                if ($rawLogo === '' || (strlen($rawLogo) > 0 && $rawLogo[0] === '/')) {
                    $sets[]   = 'logo_url = ?';
                    $params[] = $rawLogo;
                }
            }
            if (!empty($sets)) {
                $sets[] = 'updated_at = NOW()';
                $params[] = SUNBOX_USER_ID;
                try {
                    $sdb = getSunboxDB();
                    $sdb->prepare("UPDATE professional_profiles SET " . implode(', ', $sets) . " WHERE user_id = ?")->execute($params);
                } catch (\Throwable $e) { fail('Mise à jour impossible: ' . $e->getMessage()); }
            }
            ok();
            break;
        }

        case 'get_pro_credits': {
            requireAdmin();
            try {
                $balance = checkCredits();
                $sdb = getSunboxDB();
                $txStmt = $sdb->prepare("
                    SELECT id, amount, reason, quote_id, balance_after, created_at
                    FROM professional_credit_transactions
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT 20
                ");
                $txStmt->execute([SUNBOX_USER_ID]);
                $transactions = $txStmt->fetchAll();
                ok([
                    'credits'      => $balance['credits'],
                    'catalog_mode' => $balance['catalog_mode'],
                    'transactions' => $transactions,
                ]);
            } catch (\Throwable $e) {
                error_log('get_pro_credits error: ' . $e->getMessage());
                ok(['credits' => 0, 'catalog_mode' => true, 'transactions' => []]);
            }
            break;
        }

        case 'deduct_pro_credits': {
            requireAdmin();
            validateRequired($body, ['amount', 'reason']);
            $amount  = (float)$body['amount'];
            $reason  = (string)$body['reason'];
            $quoteId = isset($body['quote_id']) ? (int)$body['quote_id'] : null;
            $result  = deductCredits($amount, $reason, $quoteId);
            if (!($result['success'] ?? false)) {
                fail($result['error'] ?? 'Crédits insuffisants', 402);
            }
            ok($result['data'] ?? []);
            break;
        }

        case 'buy_pro_pack': {
            requireAdmin();
            if (!SUNBOX_USER_ID) { fail('User non configuré', 400); }
            $packAmount = 10000;
            try {
                $sdb = getSunboxDB();
                $sdb->beginTransaction();
                $sdb->prepare("UPDATE professional_profiles SET credits = credits + ?, updated_at = NOW() WHERE user_id = ?")
                    ->execute([$packAmount, SUNBOX_USER_ID]);
                $balStmt = $sdb->prepare("SELECT credits FROM professional_profiles WHERE user_id = ?");
                $balStmt->execute([SUNBOX_USER_ID]);
                $newBalance = (float)($balStmt->fetchColumn() ?: $packAmount);
                $sdb->prepare("INSERT INTO professional_credit_transactions (user_id, amount, reason, quote_id, balance_after) VALUES (?,?,?,?,?)")
                    ->execute([SUNBOX_USER_ID, $packAmount, 'pack_purchase', null, $newBalance]);
                $sdb->commit();
                ok(['credits' => $newBalance]);
            } catch (\Throwable $e) {
                try { $sdb->rollBack(); } catch (\Throwable $ignored) {}
                fail(API_DEBUG ? $e->getMessage() : 'Erreur serveur', 500);
            }
            break;
        }

        default:
            fail('Action inconnue.', 400);
    }

} catch (Throwable $e) {
    error_log('PRO API ERROR: ' . $e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : 'Erreur serveur', 500);
}
