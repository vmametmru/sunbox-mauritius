<?php
/**
 * SUNBOX MAURITIUS - Main API Endpoint
 * 
 * Upload to: public_html/api/index.php
 * 
 * Usage: POST /api/index.php?action=ACTION_NAME
 */

require_once 'config.php';

// Handle CORS
handleCORS();

// Get action from query string
$action = $_GET['action'] ?? '';

// Get request body
$body = getRequestBody();

try {
    $db = getDB();
    
    switch ($action) {
        // ============================================
        // DASHBOARD
        // ============================================
        case 'get_dashboard_stats':
            $stats = [];
            
            // Total quotes
            $stmt = $db->query("SELECT COUNT(*) as count FROM quotes");
            $stats['total_quotes'] = (int)$stmt->fetch()['count'];
            
            // Pending quotes
            $stmt = $db->query("SELECT COUNT(*) as count FROM quotes WHERE status = 'pending'");
            $stats['pending_quotes'] = (int)$stmt->fetch()['count'];
            
            // Approved quotes
            $stmt = $db->query("SELECT COUNT(*) as count FROM quotes WHERE status = 'approved'");
            $stats['approved_quotes'] = (int)$stmt->fetch()['count'];
            
            // Today's quotes
            $stmt = $db->query("SELECT COUNT(*) as count FROM quotes WHERE DATE(created_at) = CURDATE()");
            $stats['today_quotes'] = (int)$stmt->fetch()['count'];
            
            // Total revenue (approved quotes)
            $stmt = $db->query("SELECT COALESCE(SUM(total_price), 0) as total FROM quotes WHERE status = 'approved'");
            $stats['total_revenue'] = (float)$stmt->fetch()['total'];
            
            // New contacts
            $stmt = $db->query("SELECT COUNT(*) as count FROM contacts WHERE status = 'new'");
            $stats['new_contacts'] = (int)$stmt->fetch()['count'];
            
            // Recent quotes
            $stmt = $db->query("SELECT * FROM quotes ORDER BY created_at DESC LIMIT 5");
            $stats['recent_quotes'] = $stmt->fetchAll();
            
            // Monthly stats (last 6 months)
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
            
        // ============================================
        // QUOTES
        // ============================================
        case 'get_quotes':
            $status = $body['status'] ?? null;
            $limit = (int)($body['limit'] ?? 100);
            
            $sql = "SELECT q.*, 
                    (SELECT GROUP_CONCAT(option_name SEPARATOR ', ') FROM quote_options WHERE quote_id = q.id) as options_list
                    FROM quotes q";
            $params = [];
            
            if ($status) {
                $sql .= " WHERE q.status = ?";
                $params[] = $status;
            }
            
            $sql .= " ORDER BY q.created_at DESC LIMIT ?";
            $params[] = $limit;
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            successResponse($stmt->fetchAll());
            break;
            
        case 'get_quote':
            validateRequired($body, ['id']);
            
            $stmt = $db->prepare("SELECT * FROM quotes WHERE id = ?");
            $stmt->execute([$body['id']]);
            $quote = $stmt->fetch();
            
            if (!$quote) {
                errorResponse('Quote not found', 404);
            }
            
            // Get quote options
            $stmt = $db->prepare("SELECT * FROM quote_options WHERE quote_id = ?");
            $stmt->execute([$body['id']]);
            $quote['options'] = $stmt->fetchAll();
            
            successResponse($quote);
            break;
            
        case 'create_quote':
            validateRequired($body, ['model_name', 'model_type', 'base_price', 'total_price', 'customer_name', 'customer_email', 'customer_phone']);
            
            $reference = generateQuoteReference();
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
            
            $quoteId = $db->lastInsertId();
            
            // Insert options if provided
            if (!empty($body['options']) && is_array($body['options'])) {
                $optStmt = $db->prepare("
                    INSERT INTO quote_options (quote_id, option_id, option_name, option_price)
                    VALUES (?, ?, ?, ?)
                ");
                
                foreach ($body['options'] as $opt) {
                    $optStmt->execute([
                        $quoteId,
                        $opt['id'] ?? null,
                        sanitize($opt['name']),
                        (float)($opt['price'] ?? 0)
                    ]);
                }
            }
            
            // Log activity
            logActivity($db, 'quote_created', 'quote', $quoteId, ['reference' => $reference]);
            
            successResponse([
                'id' => $quoteId,
                'reference' => $reference,
                'valid_until' => $validUntil
            ], 'Quote created successfully');
            break;
            
        case 'update_quote_status':
            validateRequired($body, ['id', 'status']);
            
            $validStatuses = ['pending', 'approved', 'rejected', 'completed'];
            if (!in_array($body['status'], $validStatuses)) {
                errorResponse('Invalid status');
            }
            
            $stmt = $db->prepare("UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$body['status'], $body['id']]);
            
            logActivity($db, 'quote_status_updated', 'quote', $body['id'], ['status' => $body['status']]);
            
            successResponse(null, 'Quote status updated');
            break;
            
        case 'delete_quote':
            validateRequired($body, ['id']);
            
            $stmt = $db->prepare("DELETE FROM quotes WHERE id = ?");
            $stmt->execute([$body['id']]);
            
            logActivity($db, 'quote_deleted', 'quote', $body['id']);
            
            successResponse(null, 'Quote deleted');
            break;
            
        // ============================================
        // MODELS
        // ============================================
        case 'get_models':
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
            
            // Parse JSON features
            foreach ($models as &$model) {
                if ($model['features']) {
                    $model['features'] = json_decode($model['features'], true);
                }
            }
            
            successResponse($models);
            break;
            
        case 'create_model':
            validateRequired($body, ['name', 'type', 'base_price']);
            
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
                (bool)($body['is_active'] ?? true),
                (int)($body['display_order'] ?? 0)
            ]);
            
            $modelId = $db->lastInsertId();
            logActivity($db, 'model_created', 'model', $modelId);
            
            successResponse(['id' => $modelId], 'Model created successfully');
            break;
            
        case 'update_model':
            validateRequired($body, ['id']);
            
            $fields = [];
            $params = [];
            
            $allowedFields = ['name', 'type', 'description', 'base_price', 'dimensions', 'bedrooms', 'bathrooms', 'image_url', 'is_active', 'display_order'];
            
            foreach ($allowedFields as $field) {
                if (isset($body[$field])) {
                    $fields[] = "$field = ?";
                    $value = $body[$field];
                    
                    if (in_array($field, ['name', 'description', 'dimensions', 'image_url'])) {
                        $value = sanitize($value);
                    } elseif ($field === 'base_price') {
                        $value = (float)$value;
                    } elseif (in_array($field, ['bedrooms', 'bathrooms', 'display_order'])) {
                        $value = (int)$value;
                    } elseif ($field === 'is_active') {
                        $value = (bool)$value;
                    }
                    
                    $params[] = $value;
                }
            }
            
            if (isset($body['features'])) {
                $fields[] = "features = ?";
                $params[] = json_encode($body['features']);
            }
            
            if (empty($fields)) {
                errorResponse('No fields to update');
            }
            
            $params[] = $body['id'];
            
            $sql = "UPDATE models SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            logActivity($db, 'model_updated', 'model', $body['id']);
            
            successResponse(null, 'Model updated successfully');
            break;
            
        case 'delete_model':
            validateRequired($body, ['id']);
            
            $stmt = $db->prepare("DELETE FROM models WHERE id = ?");
            $stmt->execute([$body['id']]);
            
            logActivity($db, 'model_deleted', 'model', $body['id']);
            
            successResponse(null, 'Model deleted');
            break;
            
        // ============================================
        // OPTIONS
        // ============================================
        case 'get_options':
            $productType = $body['product_type'] ?? null;
            $category = $body['category'] ?? null;
            $activeOnly = $body['active_only'] ?? true;
            
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
            
        case 'get_option_categories':
            $stmt = $db->query("SELECT DISTINCT category FROM options WHERE is_active = 1 ORDER BY category ASC");
            successResponse($stmt->fetchAll(PDO::FETCH_COLUMN));
            break;
            
        case 'create_option':
            validateRequired($body, ['name', 'category', 'price']);
            
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
                (bool)($body['is_active'] ?? true),
                (int)($body['display_order'] ?? 0)
            ]);
            
            $optionId = $db->lastInsertId();
            logActivity($db, 'option_created', 'option', $optionId);
            
            successResponse(['id' => $optionId], 'Option created successfully');
            break;
            
        case 'update_option':
            validateRequired($body, ['id']);
            
            $fields = [];
            $params = [];
            
            $allowedFields = ['name', 'category', 'price', 'description', 'product_type', 'is_active', 'display_order'];
            
            foreach ($allowedFields as $field) {
                if (isset($body[$field])) {
                    $fields[] = "$field = ?";
                    $value = $body[$field];
                    
                    if (in_array($field, ['name', 'category', 'description'])) {
                        $value = sanitize($value);
                    } elseif ($field === 'price') {
                        $value = (float)$value;
                    } elseif ($field === 'display_order') {
                        $value = (int)$value;
                    } elseif ($field === 'is_active') {
                        $value = (bool)$value;
                    }
                    
                    $params[] = $value;
                }
            }
            
            if (empty($fields)) {
                errorResponse('No fields to update');
            }
            
            $params[] = $body['id'];
            
            $sql = "UPDATE options SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            logActivity($db, 'option_updated', 'option', $body['id']);
            
            successResponse(null, 'Option updated successfully');
            break;
            
        case 'delete_option':
            validateRequired($body, ['id']);
            
            $stmt = $db->prepare("DELETE FROM options WHERE id = ?");
            $stmt->execute([$body['id']]);
            
            logActivity($db, 'option_deleted', 'option', $body['id']);
            
            successResponse(null, 'Option deleted');
            break;
            
        // ============================================
        // SETTINGS
        // ============================================
        case 'get_settings':
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
            
            // Convert to key-value object
            $result = [];
            foreach ($settings as $setting) {
                $result[$setting['setting_key']] = $setting['setting_value'];
            }
            
            successResponse($result);
            break;
            
        case 'update_setting':
            validateRequired($body, ['key', 'value']);
            
            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value, setting_group) 
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            
            $stmt->execute([
                $body['key'],
                $body['value'],
                $body['group'] ?? 'general'
            ]);
            
            logActivity($db, 'setting_updated', 'setting', null, ['key' => $body['key']]);
            
            successResponse(null, 'Setting updated');
            break;
            
        case 'update_settings_bulk':
            validateRequired($body, ['settings']);
            
            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value, setting_group) 
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            
            foreach ($body['settings'] as $setting) {
                $stmt->execute([
                    $setting['key'],
                    $setting['value'],
                    $setting['group'] ?? 'general'
                ]);
            }
            
            logActivity($db, 'settings_bulk_updated', 'setting', null);
            
            successResponse(null, 'Settings updated');
            break;
            
        // ============================================
        // CONTACTS
        // ============================================
        case 'get_contacts':
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
            
        case 'create_contact':
            validateRequired($body, ['name', 'email', 'message']);
            
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
            
            $contactId = $db->lastInsertId();
            
            successResponse(['id' => $contactId], 'Contact message sent');
            break;
            
        case 'update_contact_status':
            validateRequired($body, ['id', 'status']);
            
            $stmt = $db->prepare("UPDATE contacts SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$body['status'], $body['id']]);
            
            successResponse(null, 'Contact status updated');
            break;
            
        // ============================================
        // EMAIL TEMPLATES
        // ============================================
        case 'get_email_templates':
            $stmt = $db->query("SELECT * FROM email_templates ORDER BY template_key ASC");
            successResponse($stmt->fetchAll());
            break;
            
        case 'update_email_template':
            validateRequired($body, ['template_key', 'subject', 'body_html']);
            
            $stmt = $db->prepare("
                UPDATE email_templates 
                SET subject = ?, body_html = ?, body_text = ?, updated_at = NOW()
                WHERE template_key = ?
            ");
            
            $stmt->execute([
                $body['subject'],
                $body['body_html'],
                $body['body_text'] ?? '',
                $body['template_key']
            ]);
            
            successResponse(null, 'Email template updated');
            break;
            
        // ============================================
        // ACTIVITY LOGS
        // ============================================
        case 'get_activity_logs':
            $limit = (int)($body['limit'] ?? 50);
            
            $stmt = $db->prepare("
                SELECT al.*, u.name as user_name 
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC 
                LIMIT ?
            ");
            $stmt->execute([$limit]);
            successResponse($stmt->fetchAll());
            break;
            
        // ============================================
        // DEFAULT
        // ============================================
        default:
            errorResponse('Invalid action: ' . $action, 400);
    }
    
} catch (PDOException $e) {
    if (API_DEBUG) {
        errorResponse('Database error: ' . $e->getMessage(), 500);
    } else {
        errorResponse('Database error occurred', 500);
    }
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}

// Helper function to log activity
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
            $details ? json_encode($details) : null,
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);
    } catch (Exception $e) {
        // Silently fail - don't break the main operation
    }
}
