<?php
/**
 * pro_public.php – Public Sunbox Bridge API for Pro Deployments
 *
 * Called by pro sites to fetch models and prices.
 * Authentication: Bearer token in Authorization header OR ?token= query param.
 * Domain validation: Origin or Referer header is matched against registered domain.
 *
 * Actions (GET ?action=xxx&token=yyy):
 *   get_models   – Returns active models with pro pricing applied (overrides + margin)
 *   check_credits – Returns credit balance for the pro user
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// ── CORS: allow any Origin (pro sites can be on any domain) ──────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function pub_fail(string $msg, int $code = 401): void {
    http_response_code($code);
    echo json_encode(['error' => $msg, 'success' => false], JSON_UNESCAPED_UNICODE);
    exit();
}

function pub_ok(array $data): void {
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit();
}

// ── Resolve token ─────────────────────────────────────────────────────────────
$token = '';
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (str_starts_with($authHeader, 'Bearer ')) {
    $token = trim(substr($authHeader, 7));
}
if (!$token) {
    $token = trim($_GET['token'] ?? '');
}
if (!$token) {
    pub_fail('API token manquant.', 401);
}

// ── Load pro profile via token ────────────────────────────────────────────────
try {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT pp.*, u.name AS user_name
        FROM professional_profiles pp
        JOIN users u ON u.id = pp.user_id
        WHERE pp.api_token = ? AND pp.is_active = 1
        LIMIT 1
    ");
    $stmt->execute([$token]);
    $profile = $stmt->fetch();
} catch (Throwable $e) {
    pub_fail('Erreur base de données.', 500);
}

if (!$profile) {
    pub_fail('Token invalide ou compte désactivé.', 401);
}

// ── Domain validation ─────────────────────────────────────────────────────────
// If a domain is registered for this pro, verify the request origin matches.
$registeredDomain = trim((string)($profile['domain'] ?? ''));
if ($registeredDomain !== '') {
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
    if ($requestOrigin) {
        $requestHost = strtolower(parse_url($requestOrigin, PHP_URL_HOST) ?: '');
        // Strip www. for comparison
        $requestHost  = preg_replace('/^www\./', '', $requestHost);
        $allowedHost  = strtolower(preg_replace('/^www\./', '', $registeredDomain));
        if ($requestHost && $requestHost !== $allowedHost) {
            pub_fail("Domaine non autorisé: $requestHost", 403);
        }
    }
    // If no Origin/Referer header is present, we allow it (server-side calls, tools)
}

$userId = (int)$profile['user_id'];
$margin = (float)($profile['sunbox_margin_percent'] ?? 0);
$credits = (float)($profile['credits'] ?? 0);
$action = $_GET['action'] ?? 'get_models';

switch ($action) {

    // ── GET MODELS ─────────────────────────────────────────────────────────────
    case 'get_models': {
        try {
            // Fetch active models from Sunbox DB
            $stmt = $db->prepare("
                SELECT m.*,
                    (SELECT COALESCE(SUM(bl.sale_price_ht * bl.qty), 0)
                     FROM boq_lines bl
                     JOIN boq_categories bc ON bc.id = bl.category_id
                     WHERE bc.model_id = m.id AND bc.is_option = 0 AND bl.is_active = 1
                    ) AS calculated_base_price
                FROM models m
                WHERE m.is_active = 1
                ORDER BY m.display_order ASC, m.id ASC
            ");
            $stmt->execute();
            $models = $stmt->fetchAll();

            // Load overrides for this pro user
            $ovStmt = $db->prepare("
                SELECT model_id, price_adjustment, is_enabled
                FROM pro_model_overrides
                WHERE user_id = ?
            ");
            $ovStmt->execute([$userId]);
            $overrides = [];
            foreach ($ovStmt->fetchAll() as $ov) {
                $overrides[(int)$ov['model_id']] = $ov;
            }

            $result = [];
            foreach ($models as $model) {
                $mid = (int)$model['id'];

                // Check if model is enabled for this pro
                if (isset($overrides[$mid]) && !(bool)$overrides[$mid]['is_enabled']) {
                    continue; // Skip disabled models
                }

                // Calculate effective price:
                // 1. Start with BOQ price or manual base_price
                $boqPrice = (float)($model['calculated_base_price'] ?? 0);
                $basePrice = $boqPrice > 0 ? $boqPrice : (float)($model['base_price'] ?? 0);

                // 2. Apply Sunbox margin (pro's share)
                if ($margin > 0) {
                    $basePrice = $basePrice * (1 + $margin / 100);
                }

                // 3. Apply model-specific price adjustment
                if (isset($overrides[$mid])) {
                    $basePrice += (float)$overrides[$mid]['price_adjustment'];
                    $basePrice = max(0, $basePrice);
                }

                $model['base_price'] = round($basePrice, 2);
                $model['calculated_base_price'] = round($basePrice, 2);
                $model['price_source'] = 'pro_adjusted';
                $model['base_price_ht'] = round($basePrice, 2);

                // Cast types
                $model['id'] = $mid;
                $model['is_active'] = (bool)$model['is_active'];
                $model['has_overflow'] = (bool)($model['has_overflow'] ?? false);
                $model['surface_m2'] = (float)($model['surface_m2'] ?? 0);
                $model['bedrooms'] = (int)($model['bedrooms'] ?? 0);
                $model['bathrooms'] = (int)($model['bathrooms'] ?? 0);
                $model['container_20ft_count'] = (int)($model['container_20ft_count'] ?? 0);
                $model['container_40ft_count'] = (int)($model['container_40ft_count'] ?? 0);
                $model['display_order'] = (int)($model['display_order'] ?? 0);

                unset($model['calculated_base_price']); // already set to base_price

                $result[] = $model;
            }

            pub_ok([
                'models' => $result,
                'catalog_mode' => $credits <= 0,
                'credits' => $credits,
            ]);
        } catch (Throwable $e) {
            pub_fail(API_DEBUG ? $e->getMessage() : 'Erreur serveur', 500);
        }
        break;
    }

    // ── CHECK CREDITS ──────────────────────────────────────────────────────────
    case 'check_credits': {
        pub_ok([
            'credits' => $credits,
            'catalog_mode' => $credits <= 0,
        ]);
        break;
    }

    // ── DEDUCT CREDITS (called by pro site when creating/validating quotes) ────
    case 'deduct_credits': {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            pub_fail('POST requis', 405);
        }
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $amount   = (float)($input['amount'] ?? 0);
        $reason   = (string)($input['reason'] ?? '');
        $quoteId  = isset($input['quote_id']) ? (int)$input['quote_id'] : null;

        $allowedReasons = ['quote_created', 'quote_validated', 'boq_requested', 'model_request', 'production_deduction'];
        if ($amount <= 0 || !in_array($reason, $allowedReasons, true)) {
            pub_fail('Paramètres invalides', 400);
        }
        if ($credits < $amount) {
            pub_fail('Crédits insuffisants', 402);
        }

        try {
            $db->beginTransaction();
            $lockStmt = $db->prepare("SELECT credits FROM professional_profiles WHERE user_id = ? FOR UPDATE");
            $lockStmt->execute([$userId]);
            $currentCredits = (float)$lockStmt->fetchColumn();
            if ($currentCredits < $amount) {
                $db->rollBack();
                pub_fail('Crédits insuffisants', 402);
            }
            $newBalance = $currentCredits - $amount;
            $db->prepare("UPDATE professional_profiles SET credits = ?, updated_at = NOW() WHERE user_id = ?")->execute([$newBalance, $userId]);
            $db->prepare("
                INSERT INTO professional_credit_transactions (user_id, amount, reason, quote_id, balance_after)
                VALUES (?, ?, ?, ?, ?)
            ")->execute([$userId, -$amount, $reason, $quoteId, $newBalance]);
            $db->commit();
            pub_ok(['credits' => $newBalance, 'catalog_mode' => $newBalance <= 0]);
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            pub_fail(API_DEBUG ? $e->getMessage() : 'Erreur serveur', 500);
        }
        break;
    }

    default:
        pub_fail('Action inconnue.', 400);
}
