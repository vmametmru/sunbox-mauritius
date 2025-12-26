<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

handleCORS();
startSession();

$action = $_GET['action'] ?? 'me';
$body   = getRequestBody();

function fail(string $msg, int $code = 401): void { errorResponse($msg, $code); }
function ok(array $data = []): void { successResponse($data); }

try {
    $adminHash = env('ADMIN_PASSWORD_HASH', '');
    $adminHash = preg_replace("/\s+/", "", $adminHash); // enlève espaces/newlines

    if (!$adminHash || strlen($adminHash) < 20) {
        fail("ADMIN_PASSWORD_HASH invalide côté serveur (.env).", 500);
    }

    switch ($action) {
        case 'login': {
            validateRequired($body, ['password']);

            $_SESSION['login_tries'] = $_SESSION['login_tries'] ?? 0;
            if ($_SESSION['login_tries'] >= 10) {
                fail("Trop de tentatives. Réessaie plus tard.", 429);
            }

            $pass = (string)$body['password'];

            if (!password_verify($pass, $adminHash)) {
                $_SESSION['login_tries']++;
                fail("Mot de passe incorrect.", 401);
            }

            session_regenerate_id(true);
            $_SESSION['is_admin'] = true;
            $_SESSION['admin_login_at'] = time();
            $_SESSION['login_tries'] = 0;

            ok(['is_admin' => true]);
            break;
        }

        case 'logout': {
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $p = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
            }
            session_destroy();
            ok(['is_admin' => false]);
            break;
        }

        case 'me':
        default: {
            ok(['is_admin' => !empty($_SESSION['is_admin'])]);
            break;
        }
    }
} catch (Throwable $e) {
    error_log("auth.php error: " . $e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : "Server error", 500);
}
