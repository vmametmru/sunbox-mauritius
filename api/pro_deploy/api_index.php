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

        case 'create_quote': {
            requireAdmin();
            $db = getDB();
            validateRequired($body, ['model_id', 'model_name', 'total_price']);

            // Deduct credits from Sunbox
            $creditResult = deductCredits(500, 'quote_created');
            if (!($creditResult['success'] ?? false)) {
                fail($creditResult['error'] ?? 'Crédits insuffisants', 402);
            }

            $stmt = $db->prepare("
                INSERT INTO pro_quotes
                    (reference_number, contact_id, customer_name, customer_email, customer_phone,
                     model_id, model_name, base_price, options_total, total_price, notes, status, valid_until)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL 30 DAY))
            ");
            $stmt->execute([
                generateReference(),
                $body['contact_id'] ?? null,
                $body['customer_name'] ?? '',
                $body['customer_email'] ?? '',
                $body['customer_phone'] ?? '',
                (int)$body['model_id'],
                $body['model_name'],
                (float)($body['base_price'] ?? 0),
                (float)($body['options_total'] ?? 0),
                (float)$body['total_price'],
                $body['notes'] ?? '',
            ]);
            ok(['id' => (int)$db->lastInsertId(), 'credits_after' => $creditResult['data']['credits'] ?? null]);
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

        default:
            fail('Action inconnue.', 400);
    }

} catch (Throwable $e) {
    error_log('PRO API ERROR: ' . $e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : 'Erreur serveur', 500);
}
