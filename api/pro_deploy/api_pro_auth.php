<?php
declare(strict_types=1);

/**
 * Pro Site – Authentication handler
 * Handles login/logout/me for the deployed pro site portal.
 * Only pro-user login is allowed (no admin login).
 * Password is verified against the Sunbox DB (authoritative source).
 */

require_once __DIR__ . '/config.php';

handleCORS();
startSession();

$action = $_GET['action'] ?? 'me';
$body   = getRequestBody();

function pro_auth_ok(array $data = []): void  { successResponse($data); }
function pro_auth_fail(string $msg, int $code = 401): void { errorResponse($msg, $code); }

try {
    switch ($action) {

        case 'login': {
            $pass = (string)($body['password'] ?? '');
            if ($pass === '') {
                pro_auth_fail('Mot de passe requis.', 400);
            }

            // Verify password against the Sunbox DB directly.
            // This ensures that password changes made in the admin panel
            // take effect immediately without requiring a site redeploy.
            $userId = (int)env('SUNBOX_USER_ID', 0);
            if ($userId <= 0) {
                pro_auth_fail('Configuration manquante (SUNBOX_USER_ID). Redéployez le site depuis sunbox-mauritius.com.', 500);
            }
            $sdb  = getSunboxDB();
            $stmt = $sdb->prepare("
                SELECT u.password_hash, pp.is_active, pp.company_name
                FROM users u
                LEFT JOIN professional_profiles pp ON pp.user_id = u.id
                WHERE u.id = ? AND u.role = 'professional'
                LIMIT 1
            ");
            $stmt->execute([$userId]);
            $row = $stmt->fetch();

            if (!$row) {
                pro_auth_fail('Compte introuvable. Redéployez le site depuis sunbox-mauritius.com.', 500);
            }
            if (!(bool)$row['is_active']) {
                pro_auth_fail('Ce compte est désactivé.', 403);
            }
            if (!password_verify($pass, (string)$row['password_hash'])) {
                pro_auth_fail('Mot de passe incorrect.', 401);
            }

            session_regenerate_id(true);
            $_SESSION['is_pro_user'] = true;
            // pro_user_id: stored so future requireAdmin() checks (in api_index.php)
            // can identify the authenticated user for per-user queries.
            $_SESSION['pro_user_id'] = $userId;

            $companyName = $row['company_name'] ?? (string)env('COMPANY_NAME', '');
            pro_auth_ok([
                'is_pro'       => true,
                'company_name' => $companyName,
            ]);
            break;
        }

        case 'logout': {
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $p = session_get_cookie_params();
                setcookie(
                    session_name(), '',
                    time() - 42000,
                    $p['path'] ?? '/',
                    $p['domain'] ?? '',
                    (bool)($p['secure'] ?? false),
                    (bool)($p['httponly'] ?? true)
                );
            }
            session_destroy();
            pro_auth_ok(['is_pro' => false]);
            break;
        }

        case 'me':
        default: {
            if (!empty($_SESSION['is_pro_user'])) {
                $companyName = (string)env('COMPANY_NAME', '');
                pro_auth_ok([
                    'is_pro'       => true,
                    'company_name' => $companyName,
                ]);
            } else {
                pro_auth_ok(['is_pro' => false]);
            }
            break;
        }
    }
} catch (Throwable $e) {
    error_log('pro_auth.php error: ' . $e->getMessage());
    pro_auth_fail(API_DEBUG ? $e->getMessage() : 'Erreur serveur', 500);
}
