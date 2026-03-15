<?php
declare(strict_types=1);

/**
 * Semi-Pro Site – Authentication handler
 *
 * Multi-user authentication: email + password verified against the Sunbox DB.
 * A single semi-pro subdirectory is shared by all semi-pro users.
 *
 * Session keys set on successful login:
 *   $_SESSION['is_pro_user']       = true
 *   $_SESSION['semi_pro_user_id']  = (int) user ID in Sunbox users table
 */

require_once __DIR__ . '/config.php';

handleCORS();
startSession();

$action = $_GET['action'] ?? 'me';
$body   = getRequestBody();

function semi_ok(array $data = []): void  { successResponse($data); }
function semi_fail(string $msg, int $code = 401): void { errorResponse($msg, $code); }

try {
    switch ($action) {

        case 'login': {
            validateRequired($body, ['email', 'password']);

            $db    = getSunboxDB();
            $email = strtolower(trim((string)$body['email']));
            $pass  = (string)$body['password'];

            $stmt = $db->prepare("
                SELECT u.id, u.name, u.email, u.password_hash, u.is_active AS user_active,
                       pp.company_name, pp.is_active AS profile_active
                FROM users u
                LEFT JOIN professional_profiles pp ON pp.user_id = u.id
                WHERE u.email = ? AND u.role = 'semi_professional'
                LIMIT 1
            ");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($pass, (string)$user['password_hash'])) {
                semi_fail('Email ou mot de passe incorrect.', 401);
            }

            if (!$user['user_active'] || !$user['profile_active']) {
                semi_fail('Ce compte est désactivé.', 403);
            }

            session_regenerate_id(true);
            $_SESSION['is_pro_user']      = true;
            $_SESSION['semi_pro_user_id'] = (int)$user['id'];

            semi_ok([
                'is_pro'          => true,
                'is_semi_pro'     => true,
                'id'              => (int)$user['id'],
                'name'            => $user['name'],
                'email'           => $user['email'],
                'company_name'    => $user['company_name'] ?? '',
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
            semi_ok(['is_pro' => false, 'is_semi_pro' => false]);
            break;
        }

        case 'me':
        default: {
            if (!empty($_SESSION['is_pro_user']) && !empty($_SESSION['semi_pro_user_id'])) {
                $db   = getSunboxDB();
                $stmt = $db->prepare("
                    SELECT u.id, u.name, u.email, u.is_active AS user_active,
                           pp.company_name, pp.is_active AS profile_active
                    FROM users u
                    LEFT JOIN professional_profiles pp ON pp.user_id = u.id
                    WHERE u.id = ? AND u.role = 'semi_professional'
                    LIMIT 1
                ");
                $stmt->execute([(int)$_SESSION['semi_pro_user_id']]);
                $user = $stmt->fetch();

                if ($user && $user['user_active'] && $user['profile_active']) {
                    semi_ok([
                        'is_pro'       => true,
                        'is_semi_pro'  => true,
                        'id'           => (int)$user['id'],
                        'name'         => $user['name'],
                        'email'        => $user['email'],
                        'company_name' => $user['company_name'] ?? '',
                    ]);
                    break;
                }
            }
            semi_ok(['is_pro' => false, 'is_semi_pro' => false]);
            break;
        }
    }
} catch (Throwable $e) {
    error_log('semi_pro_auth.php error: ' . $e->getMessage());
    semi_fail(API_DEBUG ? $e->getMessage() : 'Erreur serveur', 500);
}
