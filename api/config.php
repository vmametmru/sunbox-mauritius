<?php
/**
 * SUNBOX MAURITIUS - API config
 * Path: public_html/api/config.php
 */

declare(strict_types=1);

// --------------------
// .env loader (no composer needed)
// --------------------
function loadEnvFile(string $path): void {
    if (!is_readable($path)) return;

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) return;

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;

        $pos = strpos($line, '=');
        if ($pos === false) continue;

        $key = trim(substr($line, 0, $pos));
        $val = trim(substr($line, $pos + 1));

        // Remove optional quotes
        $val = trim($val);
        $val = trim($val, "\"'");

        if ($key === '') continue;

        // Do not overwrite existing env
        if (getenv($key) !== false) continue;

        putenv("$key=$val");
        $_ENV[$key] = $val;
        $_SERVER[$key] = $val;
    }
}

function env(string $key, string $default = ''): string {
    $v =
        ($_ENV[$key] ?? '') ?:
        ($_SERVER[$key] ?? '') ?:
        (getenv($key) !== false ? (string)getenv($key) : '');

    $v = trim((string)$v);
    $v = trim($v, "\"'");
    return $v !== '' ? $v : $default;
}

// Load .env from project root (public_html/.env)
$projectRoot = realpath(__DIR__ . '/..'); // public_html
if ($projectRoot) {
    loadEnvFile($projectRoot . '/.env');
}

// --------------------
// App / debug
// --------------------
define('API_DEBUG', env('API_DEBUG', 'false') === 'true');

// --------------------
// DB (from .env)
// --------------------
define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_NAME', env('DB_NAME', ''));
define('DB_USER', env('DB_USER', ''));
define('DB_PASS', env('DB_PASS', ''));
define('DB_CHARSET', env('DB_CHARSET', 'utf8mb4'));

// CORS settings
define('ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://sunbox-mauritius.com',
    'https://www.sunbox-mauritius.com',
    'https://famous.ai',
]);

// --------------------
// PDO
// --------------------
function getDB(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        if (!DB_NAME || !DB_USER) {
            throw new Exception("DB env missing (DB_NAME/DB_USER).");
        }

        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }

    return $pdo;
}

// --------------------
// Sessions (needed for admin login)
// --------------------
function startSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;

    // secure cookies on HTTPS
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',         // keep default host
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',    // OK for same-site app
    ]);

    session_start();
}

// --------------------
// CORS
// --------------------
function handleCORS(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    // If credentials are used, we must NOT return "*"
    $allowed = $origin && in_array($origin, ALLOWED_ORIGINS, true);

    if ($allowed) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    } else {
        // For same-origin requests (no Origin header) or simple public API usage
        header("Access-Control-Allow-Origin: *");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    header("Content-Type: application/json; charset=UTF-8");

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// --------------------
// JSON helpers
// --------------------
function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function errorResponse(string $message, int $statusCode = 400): void {
    jsonResponse(['success' => false, 'error' => $message], $statusCode);
}

function successResponse($data = null, string $message = 'Success'): void {
    $resp = ['success' => true, 'message' => $message];
    if ($data !== null) $resp['data'] = $data;
    jsonResponse($resp);
}

function getRequestBody(): array {
    $input = file_get_contents('php://input');
    $j = json_decode($input ?: '', true);
    return is_array($j) ? $j : [];
}

function validateRequired(array $data, array $fields): void {
    $missing = [];
    foreach ($fields as $f) {
        if (!isset($data[$f]) || $data[$f] === '') $missing[] = $f;
    }
    if ($missing) errorResponse("Missing required fields: " . implode(', ', $missing), 400);
}
