<?php
declare(strict_types=1);

/**
 * SUNBOX MAURITIUS - Main API Endpoint
 *
 * Path: public_html/api/index.php
 *
 * Notes:
 * - Supporte GET + POST (JSON)
 * - Protège les actions admin via session (requireAdmin)
 * - get_models: remplit image_url depuis model_images (is_primary) si image_url vide
 */

require_once __DIR__ . '/config.php';

// Handle CORS (may exit on OPTIONS)
handleCORS();

// Start session for admin endpoints (safe even for public)
if (function_exists('startSession')) {
    startSession();
}

// Action from query string
$action = $_GET['action'] ?? '';

// Request body (JSON)
$body = getRequestBody();

// Merge params: GET first, then BODY overrides
$params = array_merge($_GET, is_array($body) ? $body : []);

function p(string $key, $default = null) {
    global $params;
    return array_key_exists($key, $params) ? $params[$key] : $default;
}

function pInt(string $key, int $default = 0): int {
    $v = p($key, null);
    if ($v === null || $v === '') return $default;
    return (int)$v;
}

function pFloat(string $key, float $default = 0.0): float {
    $v = p($key, null);
    if ($v === null || $v === '') return $default;
    return (float)$v;
}

function pBool(string $key, bool $default = false): bool {
    $v = p($key, null);
    if ($v === null) return $default;
    if (is_bool($v)) return $v;
    $s = strtolower(trim((string)$v));
    if ($s === '') return $default;
    return !in_array($s, ['0', 'false', 'no', 'off'], true);
}

function requireAdminSafe(): void {
    // If you already defined requireAdmin() in config.php, use it
    if (function_exists('requireAdmin')) {
        requireAdmin();
        return;
    }

    // Fallback minimal check (auth.php sets $_SESSION['is_admin'] = true)
    if (session_status() !== PHP_SESSION_ACTIVE && function_exists('startSession')) {
        startSession();
    }
    if (empty($_SESSION['is_admin'])) {
        errorResponse('Unauthorized', 401);
    }
}

// Public actions allowed without admin session
$publicActions = [
    'get_models',
    'get_options',
    'get_option_categories',
    'create_quote',
    'create_contact',
];

// Everything else requires admin
if ($action !== '' && !in_array($action, $publicActions, true)) {
    requireAdminSafe();
}

try {
    $db = getDB();

    switch ($action) {

        // ============================================
        // DASHBOARD (ADMIN)
        // ============================================
        case 'get_dashboard_stats': {
            $stats = [];

            $stmt = $db->query("SELECT COUNT(*) as count FROM quotes");
            $stats['total_quotes'] = (int)($stmt->fetch()['count'] ?? 0);

            $stmt = $db->query("SELECT COUNT(*) as count FROM quotes WHERE status = 'pending'");
            $stats['pending_quotes'] = (int)($stmt->fetch()['count'] ?? 0);

            $stmt = $db->query("SELECT COUNT(*) as count FROM quotes WHERE status = 'approved'");
            $stats['approved_quotes'] = (int)($stmt->fetch()['count'] ?? 0);

            $stmt = $db->query("SELECT COUNT(*) as count FROM quotes WHERE DATE(created_at) = CURDATE()");
            $stats['today_quotes'] = (int)($stmt->fetch()['count'] ?? 0);

            $stmt = $db->query("SELECT COALESCE(SUM(total_price), 0) as total FROM quotes WHERE status = 'approved'");
            $stats['total_revenue'] = (float)($stmt->fetch()['total'] ?? 0);

            $stmt = $db->query("SELECT COUNT(*) as count FROM contacts WHERE status = 'new'");
            $stats['new_contacts'] = (int)($stmt->fetch()['count'] ?? 0);

            $stmt = $db->query("SELECT * FROM quotes ORDER BY created_at DESC LIMIT 5");
            $stats['recent_quotes'] = $stmt->fetchAll();

            $stmt = $db->query("
                SELECT
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as count,
                    SUM(total_price) as revenue
                FROM quotes
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month ASC
            ");
            $stats['monthly_stats'] = $stmt->fetchAll();

            successResponse($stats);
            break;
        }

        // ============================================
        // QUOTES (ADMIN)
        // ============================================
        case 'get_quotes': {
            $status = p('status', null);
            $limit  = max(1, min(500, pInt('limit', 100)));

            $sql = "SELECT q.*,
                    (SELECT GROUP_CONCAT(option_name SEPARATOR ', ') FROM quote_options WHERE quote_id = q.id) as options_list
                    FROM quotes q";
            $params2 = [];

            if ($status) {
                $sql .= " WHERE q.status = ?";
                $params2[] = $status;
            }

            // Avoid binding LIMIT (some MySQL configs dislike it)
            $sql .= " ORDER BY q.created_at DESC LIMIT " . (int)$limit;

            $stmt = $db->prepare($sql);
            $stmt->execute($params2);

            successResponse($stmt->fetchAll());
            break;
        }

        case 'get_quote': {
            $id = pInt('id', 0);
            if ($id <= 0) errorResponse('Missing id', 400);

            $stmt = $db->prepare("SELECT * FROM quotes WHERE id = ?");
            $stmt->execute([$id]);
            $quote = $stmt->fetch();

            if (!$quote) {
                errorResponse('Quote not found', 404);
            }

            $stmt = $db->prepare("SELECT * FROM quote_options WHERE quote_id = ?");
            $stmt->execute([$id]);
            $quote['options'] = $stmt->fetchAll();

            successResponse($quote);
            break;
        }

        case 'create_quote': {
            // public
            $required = ['model_name', 'model_type', 'base_price', 'total_price', 'customer_name', 'customer_email', 'customer_phone'];
            validateRequired($params, $required);

            $reference  = generateQuoteReference();
            $validUntil = date('Y-m-d', strtotime('+30 days'));

            $stmt = $db->prepare("
                INSERT INTO quotes (
                    reference_number, model_id, model_name, model_type,
                    base_price, options_total, total_price,
                    customer_name, customer_email, customer_phone,
                    customer_address, customer_message, valid_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $optionsTotal = pFloat('options_total', 0.0);

            $stmt->execute([
                $reference,
                p('model_id', null),
                sanitize((string)p('model_name', '')),
                (string)p('model_type', ''),
                (float)p('base_price', 0),
                (float)$optionsTotal,
                (float)p('total_price', 0),
                sanitize((string)p('customer_name', '')),
                sanitize((string)p('customer_email', '')),
                sanitize((string)p('customer_phone', '')),
                sanitize((string)p('customer_address', '')),
                sanitize((string)p('customer_message', '')),
                $validUntil
            ]);

            $quoteId = (int)$db->lastInsertId();

            if (!empty($params['options']) && is_array($params['options'])) {
                $optStmt = $db->prepare("
                    INSERT INTO quote_options (quote_id, option_id, option_name, option_price)
                    VALUES (?, ?, ?, ?)
                ");
                foreach ($params['options'] as $opt) {
                    $optStmt->execute([
                        $quoteId,
                        $opt['id'] ?? null,
                        sanitize((string)($opt['name'] ?? '')),
                        (float)($opt['price'] ?? 0)
                    ]);
                }
            }

            // optional log (admin table) - keep if exists
            logActivity($db, 'quote_created', 'quote', $quoteId, ['reference' => $reference]);

            successResponse([
                'id' => $quoteId,
                'reference' => $reference,
                'valid_until' => $validUntil
            ], 'Quote created successfully');
            break;
        }

        case 'update_quote_status': {
            $id = pInt('id', 0);
            $status = (string)p('status', '');
            if ($id <= 0 || $status === '') errorResponse('Missing id/status', 400);

            $validStatuses = ['pending', 'approved', 'rejected', 'completed'];
            if (!in_array($status, $validStatuses, true)) {
                errorResponse('Invalid status', 400);
            }

            $stmt = $db->prepare("UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$status, $id]);

            logActivity($db, 'quote_status_updated', 'quote', $id, ['status' => $status]);

            successResponse(null, 'Quote status updated');
            break;
        }

        case 'delete_quote': {
            $id = pInt('id', 0);
            if ($id <= 0) errorResponse('Missing id', 400);

            $stmt = $db->prepare("DELETE FROM quotes WHERE id = ?");
            $stmt->execute([$id]);

            logActivity($db, 'quote_deleted', 'quote', $id);

            successResponse(null, 'Quote deleted');
            break;
        }

        // ============================================
        // MODELS (PUBLIC get_models, ADMIN create/update/delete)
        // ============================================
        case 'get_models': {
            // public by default => active only
            $type = p('type', null);
            $activeOnly = pBool('active_only', true);

            $sql = "SELECT * FROM models WHERE 1=1";
            $params2 = [];

            if (!empty($type) && $type !== 'all') {
                $sql .= " AND type = ?";
                $params2[] = $type;
            }

            if ($activeOnly) {
                $sql .= " AND is_active = 1";
            }

            $sql .= " ORDER BY display_order ASC, name ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params2);
            $models = $stmt->fetchAll();

            // Attach primary image from model_images if image_url empty
            $ids = [];
            foreach ($models as $m) {
                if (!empty($m['id'])) $ids[] = (int)$m['id'];
            }
            $ids = array_values(array_unique(array_filter($ids)));

            $primaryByModel = [];
            if (!empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));

                // Get images ordered so first row per model is best candidate
                $imgStmt = $db->prepare("
                    SELECT model_id, file_path, is_primary, sort_order, id
                    FROM model_images
                    WHERE model_id IN ($placeholders)
                    ORDER BY model_id ASC, is_primary DESC, sort_order ASC, id DESC
                ");
                $imgStmt->execute($ids);
                $rows = $imgStmt->fetchAll();

                foreach ($rows as $r) {
                    $mid = (int)$r['model_id'];
                    if (!isset($primaryByModel[$mid])) {
                        $fp = (string)($r['file_path'] ?? '');
                        if ($fp !== '') {
                            $primaryByModel[$mid] = '/' . ltrim($fp, '/'); // public url
                        }
                    }
                }
            }

            // Parse JSON features + fill image_url fallback
            foreach ($models as &$model) {
                // features can be JSON string in DB
                if (isset($model['features']) && is_string($model['features']) && $model['features'] !== '') {
                    $decoded = json_decode($model['features'], true);
                    $model['features'] = is_array($decoded) ? $decoded : [];
                } elseif (!isset($model['features']) || $model['features'] === null) {
                    $model['features'] = [];
                }

                $mid = isset($model['id']) ? (int)$model['id'] : 0;

                // If image_url empty, use uploaded primary image
                if ((empty($model['image_url']) || trim((string)$model['image_url']) === '') && $mid > 0) {
                    if (!empty($primaryByModel[$mid])) {
                        $model['image_url'] = $primaryByModel[$mid];
                    }
                }

                // also expose primary_image_url explicitly (optional)
                $model['primary_image_url'] = ($mid > 0 && !empty($primaryByModel[$mid])) ? $primaryByModel[$mid] : ($model['image_url'] ?? '');
            }
            unset($model);

            successResponse($models);
            break;
        }

        case 'create_model': {
            validateRequired($params, ['name', 'type', 'base_price']);

            $type = (string)p('type', '');
            if (!in_array($type, ['container', 'pool'], true)) {
                errorResponse('Invalid model type', 400);
            }

            $featuresArr = p('features', []);
            $features = is_array($featuresArr) ? json_encode($featuresArr, JSON_UNESCAPED_UNICODE) : null;

            $stmt = $db->prepare("
                INSERT INTO models
                (name, type, description, base_price, dimensions, bedrooms, bathrooms, image_url, features, is_active, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                sanitize((string)p('name', '')),
                $type,
                sanitize((string)p('description', '')),
                (float)p('base_price', 0),
                sanitize((string)p('dimensions', '')),
                (int)p('bedrooms', 0),
                (int)p('bathrooms', 0),
                sanitize((string)p('image_url', '')),
                $features,
                pBool('is_active', true) ? 1 : 0,
                (int)p('display_order', 0),
            ]);

            $modelId = (int)$db->lastInsertId();
            logActivity($db, 'model_created', 'model', $modelId);

            successResponse(['id' => $modelId], 'Model created successfully');
            break;
        }

        case 'update_model': {
            $id = pInt('id', 0);
            if ($id <= 0) errorResponse('Missing id', 400);

            $fields = [];
            $params2 = [];

            $allowedFields = [
                'name', 'type', 'description', 'base_price',
                'dimensions', 'bedrooms', 'bathrooms',
                'image_url', 'is_active', 'display_order'
            ];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $params)) {
                    $fields[] = "$field = ?";
                    $value = $params[$field];

                    if (in_array($field, ['name', 'description', 'dimensions', 'image_url'], true)) {
                        $value = sanitize((string)$value);
                    } elseif ($field === 'base_price') {
                        $value = (float)$value;
                    } elseif (in_array($field, ['bedrooms', 'bathrooms', 'display_order'], true)) {
                        $value = (int)$value;
                    } elseif ($field === 'is_active') {
                        $value = pBool('is_active', true) ? 1 : 0;
                    } elseif ($field === 'type') {
                        $value = (string)$value;
                        if (!in_array($value, ['container', 'pool'], true)) {
                            errorResponse('Invalid model type', 400);
                        }
                    }

                    $params2[] = $value;
                }
            }

            if (array_key_exists('features', $params)) {
                $featuresArr = p('features', []);
                $fields[] = "features = ?";
                $params2[] = is_array($featuresArr)
                    ? json_encode($featuresArr, JSON_UNESCAPED_UNICODE)
                    : json_encode([], JSON_UNESCAPED_UNICODE);
            }

            if (empty($fields)) {
                errorResponse('No fields to update', 400);
            }

            $params2[] = $id;

            $sql = "UPDATE models SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params2);

            logActivity($db, 'model_updated', 'model', $id);

            successResponse(null, 'Model updated successfully');
            break;
        }

        case 'delete_model': {
            $id = pInt('id', 0);
            if ($id <= 0) errorResponse('Missing id', 400);

            $stmt = $db->prepare("DELETE FROM models WHERE id = ?");
            $stmt->execute([$id]);

            logActivity($db, 'model_deleted', 'model', $id);

            successResponse(null, 'Model deleted');
            break;
        }

        // ============================================
        // OPTIONS (PUBLIC get_options / get_option_categories, ADMIN create/update/delete)
        // ============================================
        case 'get_options': {
            $productType = p('product_type', null);
            $category    = p('category', null);
            $activeOnly  = pBool('active_only', true);

            $sql = "SELECT * FROM options WHERE 1=1";
            $params2 = [];

            if ($productType) {
                $sql .= " AND (product_type = ? OR product_type = 'both')";
                $params2[] = $productType;
            }

            if ($category) {
                $sql .= " AND category = ?";
                $params2[] = $category;
            }

            if ($activeOnly) {
                $sql .= " AND is_active = 1";
            }

            $sql .= " ORDER BY category ASC, display_order ASC, name ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params2);
            successResponse($stmt->fetchAll());
            break;
        }

        case 'get_option_categories': {
            $stmt = $db->query("SELECT DISTINCT category FROM options WHERE is_active = 1 ORDER BY category ASC");
            successResponse($stmt->fetchAll(PDO::FETCH_COLUMN));
            break;
        }

        case 'create_option': {
            validateRequired($params, ['name', 'category', 'price']);

            $stmt = $db->prepare("
                INSERT INTO options (name, category, price, description, product_type, is_active, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                sanitize((string)p('name', '')),
                sanitize((string)p('category', '')),
                (float)p('price', 0),
                sanitize((string)p('description', '')),
                (string)p('product_type', 'both'),
                pBool('is_active', true) ? 1 : 0,
                (int)p('display_order', 0)
            ]);

            $optionId = (int)$db->lastInsertId();
            logActivity($db, 'option_created', 'option', $optionId);

            successResponse(['id' => $optionId], 'Option created');
            break;
        }

        case 'update_option': {
            $id = pInt('id', 0);
            if ($id <= 0) errorResponse('Missing id', 400);

            $fields = [];
            $params2 = [];

            $allowedFields = ['name', 'category', 'price', 'description', 'product_type', 'is_active', 'display_order'];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $params)) {
                    $fields[] = "$field = ?";
                    $value = $params[$field];

                    if (in_array($field, ['name', 'category', 'description'], true)) {
                        $value = sanitize((string)$value);
                    } elseif ($field === 'price') {
                        $value = (float)$value;
                    } elseif ($field === 'display_order') {
                        $value = (int)$value;
                    } elseif ($field === 'is_active') {
                        $value = pBool('is_active', true) ? 1 : 0;
                    }

                    $params2[] = $value;
                }
            }

            if (empty($fields)) {
                errorResponse('No fields to update', 400);
            }

            $params2[] = $id;

            $sql = "UPDATE options SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params2);

            logActivity($db, 'option_updated', 'option', $id);

            successResponse(null, 'Option updated');
            break;
        }

        case 'delete_option': {
            $id = pInt('id', 0);
            if ($id <= 0) errorResponse('Missing id', 400);

            $stmt = $db->prepare("DELETE FROM options WHERE id = ?");
            $stmt->execute([$id]);

            logActivity($db, 'option_deleted', 'option', $id);

            successResponse(null, 'Option deleted');
            break;
        }

        // ============================================
        // SETTINGS (ADMIN)
        // ============================================
        case 'get_settings': {
            $group = p('group', null);

            $sql = "SELECT * FROM settings";
            $params2 = [];

            if ($group) {
                $sql .= " WHERE setting_group = ?";
                $params2[] = $group;
            }

            $sql .= " ORDER BY setting_group ASC, setting_key ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params2);
            $settings = $stmt->fetchAll();

            $result = [];
            foreach ($settings as $setting) {
                $result[$setting['setting_key']] = $setting['setting_value'];
            }

            successResponse($result);
            break;
        }

        case 'update_setting': {
            validateRequired($params, ['key', 'value']);

            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value, setting_group)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");

            $stmt->execute([
                (string)p('key', ''),
                (string)p('value', ''),
                (string)p('group', 'general')
            ]);

            logActivity($db, 'setting_updated', 'setting', null, ['key' => (string)p('key', '')]);

            successResponse(null, 'Setting updated');
            break;
        }

        case 'update_settings_bulk': {
            validateRequired($params, ['settings']);

            if (!is_array($params['settings'])) {
                errorResponse('settings must be an array', 400);
            }

            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value, setting_group)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");

            foreach ($params['settings'] as $setting) {
                $stmt->execute([
                    (string)($setting['key'] ?? ''),
                    (string)($setting['value'] ?? ''),
                    (string)($setting['group'] ?? 'general')
                ]);
            }

            logActivity($db, 'settings_bulk_updated', 'setting', null);

            successResponse(null, 'Settings updated');
            break;
        }

        // ============================================
        // CONTACTS (PUBLIC create_contact, ADMIN get_contacts)
        // ============================================
        case 'get_contacts': {
            $status = p('status', null);

            $sql = "SELECT * FROM contacts";
            $params2 = [];

            if ($status) {
                $sql .= " WHERE status = ?";
                $params2[] = $status;
            }

            $sql .= " ORDER BY created_at DESC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params2);

            successResponse($stmt->fetchAll());
            break;
        }

        case 'create_contact': {
            // public
            validateRequired($params, ['name', 'email', 'message']);

            $stmt = $db->prepare("
                INSERT INTO contacts (name, email, phone, subject, message)
                VALUES (?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                sanitize((string)p('name', '')),
                sanitize((string)p('email', '')),
                sanitize((string)p('phone', '')),
                sanitize((string)p('subject', '')),
                sanitize((string)p('message', '')),
            ]);

            $contactId = (int)$db->lastInsertId();
            successResponse(['id' => $contactId], 'Contact message sent');
            break;
        }

        case 'update_contact_status': {
            $id = pInt('id', 0);
            $status = (string)p('status', '');
            if ($id <= 0 || $status === '') errorResponse('Missing id/status', 400);

            $stmt = $db->prepare("UPDATE contacts SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$status, $id]);

            successResponse(null, 'Contact status updated');
            break;
        }

        // ============================================
        // EMAIL TEMPLATES (ADMIN)
        // ============================================
        case 'get_email_templates': {
            $stmt = $db->query("SELECT * FROM email_templates ORDER BY template_key ASC");
            successResponse($stmt->fetchAll());
            break;
        }

        case 'update_email_template': {
            validateRequired($params, ['template_key', 'subject', 'body_html']);

            $stmt = $db->prepare("
                UPDATE email_templates
                SET subject = ?, body_html = ?, body_text = ?, updated_at = NOW()
                WHERE template_key = ?
            ");

            $stmt->execute([
                (string)p('subject', ''),
                (string)p('body_html', ''),
                (string)p('body_text', ''),
                (string)p('template_key', ''),
            ]);

            successResponse(null, 'Email template updated');
            break;
        }

        // ============================================
        // ACTIVITY LOGS (ADMIN)
        // ============================================
        case 'get_activity_logs': {
            $limit = max(1, min(500, pInt('limit', 50)));

            $sql = "
                SELECT al.*, u.name as user_name
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT " . (int)$limit;

            $stmt = $db->query($sql);
            successResponse($stmt->fetchAll());
            break;
        }

        // ============================================
        // DEFAULT
        // ============================================
        default:
            errorResponse('Invalid action: ' . $action, 400);
    }

} catch (PDOException $e) {
    error_log("api/index.php DB error: " . $e->getMessage());
    if (defined('API_DEBUG') && API_DEBUG) {
        errorResponse('Database error: ' . $e->getMessage(), 500);
    }
    errorResponse('Database error occurred', 500);

} catch (Throwable $e) {
    error_log("api/index.php error: " . $e->getMessage());
    if (defined('API_DEBUG') && API_DEBUG) {
        errorResponse($e->getMessage(), 500);
    }
    errorResponse('Server error', 500);
}

// ------------------------------------------------------------
// Helper: activity log
// ------------------------------------------------------------
function logActivity($db, $action, $entityType, $entityId = null, $details = null) {
    try {
        $stmt = $db->prepare("
            INSERT INTO activity_logs (action, entity_type, entity_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $action,
            $entityType,
            $entityId,
            $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);
    } catch (Throwable $e) {
        // Silently fail
    }
}
