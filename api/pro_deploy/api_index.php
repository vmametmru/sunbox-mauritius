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
    $db = getDB();

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

        // ── MODELS (from Sunbox main API) ──────────────────────────────────────
        case 'get_models': {
            $result = fetchSunboxModels();
            ok($result);
            break;
        }

        case 'check_credits': {
            $result = checkSunboxCredits();
            ok($result);
            break;
        }

        // ── SITE SETTINGS (own DB) ─────────────────────────────────────────────
        case 'get_settings': {
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
            $stmt = $db->query("SELECT * FROM pro_contacts ORDER BY name ASC");
            ok($stmt->fetchAll());
            break;
        }

        case 'create_contact': {
            requireAdmin();
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
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM pro_contacts WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ── QUOTES (own DB) ────────────────────────────────────────────────────
        case 'get_quotes': {
            requireAdmin();
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
            validateRequired($body, ['model_id', 'model_name', 'total_price']);

            // Deduct credits from Sunbox
            $creditResult = deductSunboxCredits(500, 'quote_created');
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
            validateRequired($body, ['id', 'status']);
            $id     = (int)$body['id'];
            $status = $body['status'];

            // Validate quote
            if ($status === 'approved') {
                $creditResult = deductSunboxCredits(1000, 'quote_validated', $id);
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
            validateRequired($body, ['id']);
            $db->prepare("DELETE FROM pro_quotes WHERE id = ?")->execute([(int)$body['id']]);
            ok();
            break;
        }

        // ── DASHBOARD STATS ────────────────────────────────────────────────────
        case 'get_dashboard_stats': {
            requireAdmin();
            $totalQuotes   = (int)$db->query("SELECT COUNT(*) FROM pro_quotes")->fetchColumn();
            $pendingQuotes = (int)$db->query("SELECT COUNT(*) FROM pro_quotes WHERE status = 'pending'")->fetchColumn();
            $approvedQuotes = (int)$db->query("SELECT COUNT(*) FROM pro_quotes WHERE status = 'approved'")->fetchColumn();
            $totalRevenue  = (float)$db->query("SELECT COALESCE(SUM(total_price),0) FROM pro_quotes WHERE status IN ('approved','completed')")->fetchColumn();
            $totalContacts = (int)$db->query("SELECT COUNT(*) FROM pro_contacts")->fetchColumn();

            $credits = checkSunboxCredits();

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
