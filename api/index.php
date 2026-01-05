<?php
require_once 'config.php';

handleCORS();

$action = $_GET['action'] ?? '';
$body = getRequestBody();

try {
    $db = getDB();

    switch ($action) {

        /* =====================================================
           MODELS (PUBLIC + ADMIN)
        ===================================================== */

        case 'get_models': {
            $type = $body['type'] ?? null;
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

            successResponse($models);
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

            successResponse(['id' => $db->lastInsertId()]);
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
                if (isset($body[$f])) {
                    $fields[] = "$f = ?";
                    if ($f === 'features') {
                        $params[] = json_encode($body[$f]);
                    } elseif (in_array($f, ['base_price'])) {
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

            if (!$fields) errorResponse('Nothing to update');

            $params[] = (int)$body['id'];

            $sql = "UPDATE models SET ".implode(',', $fields).", updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            successResponse();
            break;
        }

        default:
            errorResponse('Invalid action', 400);
    }

} catch (Throwable $e) {
    errorResponse(API_DEBUG ? $e->getMessage() : 'Server error', 500);
}
