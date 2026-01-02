<?php
declare(strict_types=1);
/**
 * SUNBOX MAURITIUS - Main API Endpoint
 *
 * Upload to: public_html/api/index.php
 *
 * Usage: POST /api/index.php?action=ACTION_NAME
 */

require_once __DIR__ . '/config.php';

handleCORS();

$action = $_GET['action'] ?? '';
$body   = getRequestBody();

/**
 * Helper: parse bool correctly (accept true/false, 1/0, "true"/"false", "yes"/"no", "on"/"off")
 */
function parseBool($v, bool $default = false): bool {
    if ($v === null) return $default;
    if (is_bool($v)) return $v;
    if (is_int($v)) return $v === 1;
    $s = strtolower(trim((string)$v));
    if (in_array($s, ['1','true','yes','on'], true)) return true;
    if (in_array($s, ['0','false','no','off',''], true)) return false;
    return $default;
}

/**
 * Actions that must be ADMIN-only (session required)
 * (Public actions stay accessible: get_models, get_options, create_quote, create_contact, etc.)
 */
$ADMIN_ACTIONS = [
    'get_dashboard_stats',

    // Quotes admin management
    'get_quotes',
    'get_quote',
    'update_quote_status',
    'delete_quote',

    // Models admin management
    'create_model',
    'update_model',
    'delete_model',

    // Options admin management
    'create_option',
    'update_option',
    'delete_option',

    // Settings admin management
    'get_settings',
    'update_setting',
    'update_settings_bulk',

    // Contacts admin management
    'get_contacts',
    'update_contact_status',

    // Email templates admin management
    'get_email_templates',
    'update_email_template',

    // Activity logs (admin)
    'get_activity_logs',
];

try {
    if (in_array($action, $ADMIN_ACTIONS, true)) {
        startSession();
        // requireAdmin() doit exister dans config.php (sinon ajoute-le)
        requireAdmin();
    }

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
                    COALESCE(SUM(total_price), 0) as revenue
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
        // QUOTES
        // ============================================
        case 'get_quotes': {
            $status = $body['status'] ?? null;
            $limit  = (int)($body['limit'] ?? 100);
            if ($limit <= 0) $limit = 100;
            if ($limit > 500) $limit = 500;

            $sql = "SELECT q.*,
                (SELECT GROUP_CONCAT(option_name SEPARATOR ', ')
                 FROM quote_options WHERE quote_id = q.id) as options_list
                FROM quotes q";
            $params = [];

            if ($status) {
                $sql .= " WHERE q.status = ?";
                $params[] = $status;
            }

            // évite binding LIMIT (parfois bloqué)
            $sql .= " ORDER BY q.created_at DESC LIMIT " . (int)$limit;

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            successResponse($stmt->fetchAll());
            break;
        }

        case 'get_quote': {
            validateRequired($body, ['id']);

            $stmt = $db->prepare("SELECT * FROM quotes WHERE id = ?");
            $stmt->execute([(int)$body['id']]);
            $quote = $stmt->fetch();

            if (!$quote) {
                errorResponse('Quote not found', 404);
            }

            $stmt = $db->prepare("SELECT * FROM quote_options WHERE quote_id = ?");
            $stmt->execute([(int)$body['id']]);
            $quote['options'] = $stmt->fetchAll();

            successResponse($quote);
            break;
        }

        case 'create_quote': {
            validateRequired($body, [
                'model_name','model_type','base_price','total_price',
                'customer_name','customer_email','customer_phone'
            ]);

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

            $optionsTotal = (float)($body['options_total'] ?? 0);

            $stmt->execute([
                $reference,
                $body['model_id'] ?? null,
                sanitize($body['model_name']),
                $body['model_type'],
                (float)$body['base_price'],
                $optionsTotal,
                (float)$body['total_price'],
                sanitize($body['customer_name']),
                sanitize($body['customer_email']),
                sanitize($body['customer_phone']),
                sanitize($body['customer_address'] ?? ''),
                sanitize($body['customer_message'] ?? ''),
                $validUntil
            ]);

            $quoteId = (int)$db->lastInsertId();

            if (!empty($body['options']) && is_array($body['options'])) {
                $optStmt = $db->prepare("
                    INSERT INTO quote_options (quote_id, option_id, option_name, option_price)
                    VALUES (?, ?, ?, ?)
                ");

                foreach ($body['options'] as $opt) {
                    $optStmt->execute([
                        $quoteId,
                        $opt['id'] ?? null,
                        sanitize($opt['name'] ?? ''),
                        (float)($opt['price'] ?? 0)
                    ]);
                }
            }

            logActivity($db, 'quote_created', 'quote', $quoteId, ['reference' => $reference]);

            successResponse([
                'id' => $quoteId,
                'reference' => $reference,
                'valid_until' => $validUntil
            ], 'Quote created successfully');
            break;
        }

        case 'update_quote_status': {
            validateRequired($body, ['id','status']);

            $validStatuses = ['pending','approved','rejected','completed'];
            if (!in_array($body['status'], $validStatuses, true)) {
                errorResponse('Invalid status');
            }

            $stmt = $db->prepare("UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$body['status'], (int)$body['id']]);

            logActivity($db, 'quote_status_updated', 'quote', (int)$body['id'], ['status' => $body['status']]);

            successResponse(null, 'Quote status updated');
            break;
        }

        case 'delete_quote': {
            validateRequired($body, ['id']);

            $stmt = $db->prepare("DELETE FROM quotes WHERE id = ?");
            $stmt->execute([(int)$body['id']]);

            logActivity($db, 'quote_deleted', 'quote', (int)$body['id']);

            successResponse(null, 'Quote deleted');
            break;
        }

        // ============================================
        // MODELS
        // ============================================
        case 'get_models': {
            $type = $body['type'] ?? null;

            // IMPORTANT: parse bool properly (sinon "false" peut devenir true)
            $activeOnly = array_key_exists('active_only', $body)
                ? parseBool($body['active_only'], true)
                : true;

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

            foreach ($models as &$model) {
                if (!empty($model['features'])) {
                    $decoded = json_decode((string)$model['features'], true);
                    $model['features'] = is_array($decoded) ? $decoded : [];
                } else {
                    $model['features'] = [];
                }
            }
            unset($model);

            successResponse($models);
            break;
        }

        case 'create_model': {
            validateRequired($body, ['name','type','base_price']);

            $features = isset($body['features']) ? json_encode($body['features']) : null;

            $stmt = $db->prepare("
                INSERT INTO models (name, type, description, base_price, dimensions, bedrooms, bathrooms, image_url, features, is_active, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                sanitize($body['name']),
                $body['type'],
                sanitize($body['description'] ?? ''),
                (float)$body['base_price'],
                sanitize($body['dimensions'] ?? ''),
                (int)($body['bedrooms'] ?? 0),
                (int)($body['bathrooms'] ?? 0),
                sanitize($body['image_url'] ?? ''),
                $features,
                parseBool($body['is_active'] ?? true, true),
                (int)($body['display_order'] ?? 0)
            ]);

            $modelId = (int)$db->lastInsertId();
            logActivity($db, 'model_created', 'model', $modelId);

            successResponse(['id' => $modelId], 'Model created successfully');
            break;
        }

        case 'update_model': {
            validateRequired($body, ['id']);

            $fields = [];
            $params = [];

            $allowedFields = [
                'name','type','description','base_price','dimensions',
                'bedrooms','bathrooms','image_url','is_active','display_order'
            ];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $body)) {
                    $fields[] = "$field = ?";
                    $value = $body[$field];

                    if (in_array($field, ['name','description','dimensions','image_url'], true)) {
                        $value = sanitize((string)$value);
                    } elseif ($field === 'base_price') {
                        $value = (float)$value;
                    } elseif (in_array($field, ['bedrooms','bathrooms','display_order'], true)) {
                        $value = (int)$value;
                    } elseif ($field === 'is_active') {
                        $value = parseBool($value, true);
                    }

                    $params[] = $value;
                }
            }

            if (array_key_exists('features', $body)) {
                $fields[] = "features = ?";
                $params[] = json_encode($body['features']);
            }

            if (empty($fields)) {
                errorResponse('No fields to update');
            }

            $params[] = (int)$body['id'];

            $sql = "UPDATE models SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            logActivity($db, 'model_updated', 'model', (int)$body['id']);

            successResponse(null, 'Model updated successfully');
            break;
        }

        case 'delete_model': {
            validateRequired($body, ['id']);

            $stmt = $db->prepare("DELETE FROM models WHERE id = ?");
            $stmt->execute([(int)$body['id']]);

            logActivity($db, 'model_deleted', 'model', (int)$body['id']);

            successResponse(null, 'Model deleted');
            break;
        }

        // ============================================
        // OPTIONS
        // ============================================
        case 'get_options': {
            $productType = $body['product_type'] ?? null;
            $category    = $body['category'] ?? null;

            $activeOnly = array_key_exists('active_only', $body)
                ? parseBool($body['active_only'], true)
                : true;

            $sql = "SELECT * FROM options WHERE 1=1";
            $params = [];

            if ($productType) {
                $sql .= " AND (product_type = ? OR product_type = 'both')";
                $params[] = $productType;
            }

            if ($category) {
                $sql .= " AND category = ?";
                $params[] = $category;
            }

            if ($activeOnly) {
                $sql .= " AND is_active = 1";
            }

            $sql .= " ORDER BY category ASC, display_order ASC, name ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            successResponse($stmt->fetchAll());
            break;
        }

        case 'get_option_categories': {
            $stmt = $db->query("SELECT DISTINCT category FROM options WHERE is_active = 1 ORDER BY category ASC");
            successResponse($stmt->fetchAll(PDO::FETCH_COLUMN));
            break;
        }

        case 'create_option': {
            validateRequired($body, ['name','category','price']);

            $stmt = $db->prepare("
                INSERT INTO options (name, category, price, description, product_type, is_active, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['category']),
                (float)$body['price'],
                sanitize($body['description'] ?? ''),
                $body['product_type'] ?? 'both',
                parseBool($body['is_active'] ?? true, true),
                (int)($body['display_order'] ?? 0)
            ]);

            $optionId = (int)$db->lastInsertId();
            logActivity($db, 'option_created', 'option', $optionId);

            successResponse(['id' => $optionId], 'Option created');
            break;
        }

        case 'update_option': {
            validateRequired($body, ['id']);

            $fields = [];
            $params = [];

            $allowedFields = ['name','category','price','description','product_type','is_active','display_order'];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $body)) {
                    $fields[] = "$field = ?";
                    $value = $body[$field];

                    if (in_array($field, ['name','category','description'], true)) {
                        $value = sanitize((string)$value);
                    } elseif ($field === 'price') {
                        $value = (float)$value;
                    } elseif ($field === 'display_order') {
                        $value = (int)$value;
                    } elseif ($field === 'is_active') {
                        $value = parseBool($value, true);
                    }

                    $params[] = $value;
                }
            }

            if (empty($fields)) {
                errorResponse('No fields to update');
            }

            $params[] = (int)$body['id'];

            $sql = "UPDATE options SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            logActivity($db, 'option_updated', 'option', (int)$body['id']);

            successResponse(null, 'Option updated');
            break;
        }

        case 'delete_option': {
            validateRequired($body, ['id']);

            $stmt = $db->prepare("DELETE FROM options WHERE id = ?");
            $stmt->execute([(int)$body['id']]);

            logActivity($db, 'option_deleted', 'option', (int)$body['id']);

            successResponse(null, 'Option deleted');
            break;
        }

        // ============================================
        // SETTINGS (ADMIN)
        // ============================================
        case 'get_settings': {
            $group = $body['group'] ?? null;

            $sql = "SELECT * FROM settings";
            $params = [];

            if ($group) {
                $sql .= " WHERE setting_group = ?";
                $params[] = $group;
            }

            $sql .= " ORDER BY setting_group ASC, setting_key ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $settings = $stmt->fetchAll();

            $result = [];
            foreach ($settings as $setting) {
                $result[$setting['setting_key']] = $setting['setting_value'];
            }

            successResponse($result);
            break;
        }

        case 'update_setting': {
            validateRequired($body, ['key','value']);

            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value, setting_group)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");

            $stmt->execute([
                (string)$body['key'],
                (string)$body['value'],
                (string)($body['group'] ?? 'general')
            ]);

            logActivity($db, 'setting_updated', 'setting', null, ['key' => (string)$body['key']]);

            successResponse(null, 'Setting updated');
            break;
        }

        case 'update_settings_bulk': {
            validateRequired($body, ['settings']);

            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value, setting_group)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");

            foreach ((array)$body['settings'] as $setting) {
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
        // CONTACTS (admin list / public create)
        // ============================================
        case 'get_contacts': {
            $status = $body['status'] ?? null;

            $sql = "SELECT * FROM contacts";
            $params = [];

            if ($status) {
                $sql .= " WHERE status = ?";
                $params[] = $status;
            }

            $sql .= " ORDER BY created_at DESC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            successResponse($stmt->fetchAll());
            break;
        }

        case 'create_contact': {
            validateRequired($body, ['name','email','message']);

            $stmt = $db->prepare("
                INSERT INTO contacts (name, email, phone, subject, message)
                VALUES (?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                sanitize($body['name']),
                sanitize($body['email']),
                sanitize($body['phone'] ?? ''),
                sanitize($body['subject'] ?? ''),
                sanitize($body['message'])
            ]);

            successResponse(['id' => (int)$db->lastInsertId()], 'Contact message sent');
            break;
        }

        case 'update_contact_status': {
            validateRequired($body, ['id','status']);

            $stmt = $db->prepare("UPDATE contacts SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([(string)$body['status'], (int)$body['id']]);

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
            validateRequired($body, ['template_key','subject','body_html']);

            $stmt = $db->prepare("
                UPDATE email_templates
                SET subject = ?, body_html = ?, body_text = ?, updated_at = NOW()
                WHERE template_key = ?
            ");

            $stmt->execute([
                (string)$body['subject'],
                (string)$body['body_html'],
                (string)($body['body_text'] ?? ''),
                (string)$body['template_key']
            ]);

            successResponse(null, 'Email template updated');
            break;
        }

        // ============================================
        // ACTIVITY LOGS (ADMIN)
        // ============================================
        case 'get_activity_logs': {
            $limit = (int)($body['limit'] ?? 50);
            if ($limit <= 0) $limit = 50;
            if ($limit > 500) $limit = 500;

            $stmt = $db->prepare("
                SELECT al.*
                FROM activity_logs al
                ORDER BY al.created_at DESC
                LIMIT " . (int)$limit
            );
            $stmt->execute();
            successResponse($stmt->fetchAll());
            break;
        }

        default:
            errorResponse('Invalid action: ' . $action, 400);
    }

} catch (PDOException $e) {
    error_log("index.php PDO error: " . $e->getMessage());
    errorResponse(API_DEBUG ? ('Database error: ' . $e->getMessage()) : 'Database error occurred', 500);
} catch (Throwable $e) {
    error_log("index.php error: " . $e->getMessage());
    errorResponse(API_DEBUG ? $e->getMessage() : 'Server error', 500);
}

// Helper function to log activity
function logActivity($db, $action, $entityType, $entityId = null, $details = null): void {
    try {
        $stmt = $db->prepare("
            INSERT INTO activity_logs (action, entity_type, entity_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            (string)$action,
            (string)$entityType,
            $entityId,
            $details ? json_encode($details) : null,
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);
    } catch (Throwable $e) {
        // Silently fail
    }
}
