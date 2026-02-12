<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

handleCORS();
startSession();

$action = $_GET['action'] ?? 'me';
$body   = getRequestBody();

function fail(string $msg, int $code = 401): void { errorResponse($msg, $code); }
function ok(array $data = []): void { successResponse($data); }

/**
 * Check if dev_mode_no_password is enabled in database settings
 */
function isDevModeNoPasswordEnabled(): bool {
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'dev_mode_no_password' AND setting_group = 'site'");
        $stmt->execute();
        $row = $stmt->fetch();
        return $row && strtolower((string)$row['setting_value']) === 'true';
    } catch (Throwable $e) {
        return false;
    }
}

try {
    // Check if dev mode no password is enabled
    $devModeNoPassword = isDevModeNoPasswordEnabled();

    // If dev mode is enabled and user is not already admin, auto-login
    if ($devModeNoPassword && $action === 'me' && empty($_SESSION['is_admin'])) {
        session_regenerate_id(true);
        $_SESSION['is_admin'] = true;
        $_SESSION['admin_login_at'] = time();
        $_SESSION['dev_mode_login'] = true;
        ok(['is_admin' => true, 'dev_mode' => true]);
        exit;
    }

    // 1) Lecture du hash depuis .env (format normal bcrypt: $2y$...)
    $adminHash = (string) env('ADMIN_PASSWORD_HASH', '');
    $adminHash = trim($adminHash);
    $adminHash = trim($adminHash, "\"'");
    $adminHash = preg_replace("/\s+/", "", $adminHash);

    // 2) Fallback base64 UNIQUEMENT si le hash normal est vide
    if ($adminHash === '') {
        $b64 = (string) env('ADMIN_PASSWORD_HASH_BASE64', '');
        $b64 = trim($b64);
        $b64 = trim($b64, "\"'");
        if ($b64 !== '') {
            $decoded = base64_decode($b64, true);
            if ($decoded !== false && $decoded !== '') {
                $adminHash = trim($decoded);
                $adminHash = trim($adminHash, "\"'");
                $adminHash = preg_replace("/\s+/", "", $adminHash);
            }
        }
    }

    // 3) Validation - skip if dev mode is enabled (no password needed)
    if (!$devModeNoPassword && ($adminHash === '' || strlen($adminHash) < 20 || strpos($adminHash, '$2') !== 0)) {
        fail("ADMIN_PASSWORD_HASH invalide côté serveur (.env).", 500);
    }

    switch ($action) {
        case 'login': {
            // In dev mode, auto-login without password
            if ($devModeNoPassword) {
                session_regenerate_id(true);
                $_SESSION['is_admin'] = true;
                $_SESSION['admin_login_at'] = time();
                $_SESSION['login_tries'] = 0;
                $_SESSION['dev_mode_login'] = true;
                ok(['is_admin' => true, 'dev_mode' => true]);
                break;
            }

            validateRequired($body, ['password']);

            $_SESSION['login_tries'] = $_SESSION['login_tries'] ?? 0;
            if ($_SESSION['login_tries'] >= 10) {
                fail("Trop de tentatives. Réessaie plus tard.", 429);
            }

            $pass = (string)($body['password'] ?? '');

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
                setcookie(
                    session_name(),
                    '',
                    time() - 42000,
                    $p['path'] ?? '/',
                    $p['domain'] ?? '',
                    (bool)($p['secure'] ?? false),
                    (bool)($p['httponly'] ?? true)
                );
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
