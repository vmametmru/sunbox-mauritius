<?php
declare(strict_types=1);

/**
 * SUNBOX MAURITIUS – MAIN API ENDPOINT
 * Path: /api/index.php
 */

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

        /* =====================================================
           DASHBOARD
        ===================================================== */
        case 'get_dashboard_stats': {
            $stats = [];

            $stats['total_quotes'] =
                (int)$db->query("SELECT COUNT(*) FROM quotes")->fetchColumn();

            $stats['pending_quotes'] =
                (int)$db->query("SELECT COUNT(*) FROM quotes WHERE status='pending'")->fetchColumn();

            $stats['approved_quotes'] =
                (int)$db->query("SELECT COUNT(*) FROM quotes WHERE status='approved'")->fetchColumn();

            $stats['total_revenue'] =
                (float)$db->query("SELECT COALESCE(SUM(total_price),0) FROM quotes WHERE status='approved'")->fetchColumn();

            ok($stats);
            break;
        }

        /* =====================================================
           SETTINGS (PUBLIC + ADMIN)
        ===================================================== */
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

        /* =====================================================
           MODELS (PUBLIC + ADMIN)
        ===================================================== */
        case 'get_models': {
            $type       = $body['type'] ?? null;
            $activeOnly = $body['active_only'] ?? true;

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
                $m['features'] = $m['features']
                    ? json_decode($m['features'], true)
                    : [];
            }

            ok($models);
            break;
        }

        case 'create_model': {
            validateRequired($body, ['name', 'type', 'base_price']);

            $stmt = $db->prepare("
                INSERT INTO models (
                    name, type, description, base_price,
                    dimensions, bedrooms, bathrooms,
                    image_url, plan_image_url,
                    features, is_active, display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                'name','type','description','base_price','dimensions',
                'bedrooms','bathrooms','image_url','plan_image_url',
                'features','is_active','display_order'
            ];

            $fields = [];
            $params = [];

            foreach ($allowed as $f) {
                if (array_key_exists($f, $body)) {
                    $fields[] = "$f = ?";
                    if ($f === 'features') {
                        $params[] = json_encode($body[$f]);
                    } elseif ($f === 'base_price') {
                        $params[] = (float)$body[$f];
                    } elseif (in_array($f, ['bedrooms','bathrooms','display_order'])) {
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

        /* =====================================================
           DEFAULT
        ===================================================== */
        default:
            fail('Invalid action', 400);
    }

} catch (Throwable $e) {
    error_log('API ERROR: '.$e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : 'Server error', 500);
}
