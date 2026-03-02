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
            $sdb  = getSunboxDB();
            $stmt = $sdb->prepare("
                SELECT bc.id, bc.name, bc.display_order, bc.parent_id, bc.qty_editable,
                       mi.file_path as image_path,
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
                $opt['id']         = (int)$opt['id'];
                $opt['parent_id']  = $opt['parent_id'] ? (int)$opt['parent_id'] : null;
                $opt['display_order'] = (int)$opt['display_order'];
                $opt['qty_editable']  = (bool)($opt['qty_editable'] ?? false);
                $opt['image_url']  = sunboxAbsUrl(
                    $opt['image_path'] ? '/' . ltrim($opt['image_path'], '/') : null
                );
                unset($opt['image_path']);
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
            $sdb  = getSunboxDB();
            $stmt = $sdb->prepare("
                SELECT id, description FROM boq_lines
                WHERE category_id = ? ORDER BY description ASC
            ");
            $stmt->execute([$categoryId]);
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
                SELECT q.*, c.name AS contact_name, c.email AS contact_email
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

        case 'get_contact_by_device': {
            // Public — no auth needed (pre-fills visitor form with saved info)
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

                // Insert quote
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

            // Validate quote
            if ($status === 'approved') {
                $creditResult = deductCredits(1000, 'quote_validated', $id);
                if (!($creditResult['success'] ?? false)) {
                    fail($creditResult['error'] ?? 'Crédits insuffisants', 402);
                }
            }

            $db->prepare("UPDATE pro_quotes SET status = ?, updated_at = NOW() WHERE id = ?")->execute([$status, $id]);
            ok();
            break;
        }

        case 'delete_quote': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM pro_quotes WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ── DISCOUNTS (own DB) ─────────────────────────────────────────────────
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

        default:
            fail('Action inconnue.', 400);
    }

} catch (Throwable $e) {
    error_log('PRO API ERROR: ' . $e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : 'Erreur serveur', 500);
}
