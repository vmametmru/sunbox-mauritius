<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

handleCORS();
startSession();

$action = $_GET['action'] ?? 'me';
$body   = getRequestBody();

function pro_fail(string $msg, int $code = 401): void { errorResponse($msg, $code); }
function pro_ok(array $data = []): void { successResponse($data); }

try {
    switch ($action) {

        case 'login': {
            validateRequired($body, ['email', 'password']);

            $db    = getDB();
            $email = strtolower(trim((string)$body['email']));
            $pass  = (string)$body['password'];

            $stmt = $db->prepare("
                SELECT u.id, u.name, u.email, u.password_hash,
                       pp.company_name, pp.credits, pp.is_active AS profile_active
                FROM users u
                LEFT JOIN professional_profiles pp ON pp.user_id = u.id
                WHERE u.email = ? AND u.role = 'professional'
                LIMIT 1
            ");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user) {
                pro_fail('Email ou mot de passe incorrect.', 401);
            }

            if (!password_verify($pass, (string)$user['password_hash'])) {
                pro_fail('Email ou mot de passe incorrect.', 401);
            }

            if (!$user['profile_active']) {
                pro_fail('Ce compte est désactivé.', 403);
            }

            session_regenerate_id(true);
            $_SESSION['is_pro_user'] = true;
            $_SESSION['pro_user_id'] = (int)$user['id'];

            pro_ok([
                'is_pro'       => true,
                'id'           => (int)$user['id'],
                'name'         => $user['name'],
                'email'        => $user['email'],
                'company_name' => $user['company_name'] ?? '',
                'credits'      => (float)($user['credits'] ?? 0),
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
            pro_ok(['is_pro' => false]);
            break;
        }

        case 'me':
        default: {
            if (!empty($_SESSION['is_pro_user']) && !empty($_SESSION['pro_user_id'])) {
                $db   = getDB();
                $stmt = $db->prepare("
                    SELECT u.id, u.name, u.email,
                           pp.company_name, pp.credits, pp.is_active AS profile_active
                    FROM users u
                    LEFT JOIN professional_profiles pp ON pp.user_id = u.id
                    WHERE u.id = ? AND u.role = 'professional'
                    LIMIT 1
                ");
                $stmt->execute([(int)$_SESSION['pro_user_id']]);
                $user = $stmt->fetch();

                if ($user && $user['profile_active']) {
                    pro_ok([
                        'is_pro'       => true,
                        'id'           => (int)$user['id'],
                        'name'         => $user['name'],
                        'email'        => $user['email'],
                        'company_name' => $user['company_name'] ?? '',
                        'credits'      => (float)($user['credits'] ?? 0),
                    ]);
                    break;
                }
            }
            pro_ok(['is_pro' => false]);
            break;
        }
    }
} catch (Throwable $e) {
    error_log('pro_auth.php error: ' . $e->getMessage());
    pro_fail(API_DEBUG ? $e->getMessage() : 'Server error', 500);
}
