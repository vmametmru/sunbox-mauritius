<?php
declare(strict_types=1);

/**
 * Pro Site – Authentication handler
 * Handles login/logout/me for the deployed pro site admin portal.
 * Password is stored as a bcrypt hash in .env ADMIN_PASSWORD_HASH.
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
            $hash = (string)env('ADMIN_PASSWORD_HASH', '');
            if ($hash === '') {
                pro_auth_fail('Configuration d\'authentification manquante. Redéployez le site depuis sunbox-mauritius.com.', 500);
            }
            if (!password_verify($pass, $hash)) {
                pro_auth_fail('Mot de passe incorrect.', 401);
            }            session_regenerate_id(true);
            $_SESSION['is_admin'] = true;
            $companyName = (string)env('COMPANY_NAME', '');
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
            if (!empty($_SESSION['is_admin'])) {
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
