<?php
/**
 * SUNBOX MAURITIUS - API Configuration
 * Location on server: public_html/api/config.php
 * .env location on server: public_html/.env
 */

function startSession() {
    if (session_status() === PHP_SESSION_ACTIVE) return;

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

    // Cookies de session compatibles cross-site si besoin
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',        // laisse vide (recommandé)
        'secure' => $isHttps,  // true en https
        'httponly' => true,
        'samesite' => 'Lax',  // IMPORTANT si front sur autre domaine
    ]);

    session_start();
}

/**
 * Load .env from project root (public_html/.env)
 * No external dependency required.
 */
function loadEnvFile(string $path): void
{
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        // Skip comments
        if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, ';')) {
            continue;
        }

        // Support "export KEY=VALUE"
        if (str_starts_with($line, 'export ')) {
            $line = trim(substr($line, 7));
        }

        // Must contain "="
        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }

        $key = trim(substr($line, 0, $pos));
        $value = trim(substr($line, $pos + 1));

        if ($key === '') {
            continue;
        }

        // Remove surrounding quotes
        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }

        // Don’t overwrite existing env (cPanel can set env too)
        $already = getenv($key);
        if ($already !== false) {
            continue;
        }

        // Populate env
        putenv("$key=$value");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

/**
 * Read env var with default
 */
function env(string $key, $default = null)
{
    $val = getenv($key);
    if ($val === false || $val === null) {
        return $default;
    }
    return $val;
}

function envBool(string $key, bool $default = false): bool
{
    $v = strtolower((string)env($key, $default ? 'true' : 'false'));
    return in_array($v, ['1', 'true', 'yes', 'on'], true);
}

// Load .env from public_html/.env (one level above /api)
$projectRoot = realpath(__DIR__ . '/..'); // public_html
if ($projectRoot) {
    loadEnvFile($projectRoot . '/.env');
}

// ----------------------
// Settings from .env
// ----------------------

// API
define('API_DEBUG', envBool('API_DEBUG', false));

// Database
define('DB_HOST', (string) env('DB_HOST', 'localhost'));
define('DB_NAME', (string) env('DB_NAME', ''));
define('DB_USER', (string) env('DB_USER', ''));
define('DB_PASS', (string) env('DB_PASS', ''));
define('DB_CHARSET', (string) env('DB_CHARSET', 'utf8mb4'));

// CORS settings
define('ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://sunbox-mauritius.com',
    'https://www.sunbox-mauritius.com',
    'https://famous.ai',
]);

/**
 * Optional SMTP defaults from .env (useful as fallback)
 * (No secret in GitHub — real values only in server .env)
 */
$SMTP_CONFIG = [
    'host'       => (string) env('SMTP_HOST', ''),
    'port'       => (int)    env('SMTP_PORT', '587'),
    'username'   => (string) env('SMTP_USER', ''),
    'password'   => (string) env('SMTP_PASS', ''), // secret lives ONLY in .env on server
    'secure'     => (string) env('SMTP_SECURE', 'tls'), // tls|ssl
    'from_email' => (string) env('SMTP_FROM_EMAIL', env('SMTP_USER', '')),
    'from_name'  => (string) env('SMTP_FROM_NAME', 'Sunbox Ltd'),
];

// ----------------------
// PDO connection
// ----------------------
function getDB() {
    static $pdo = null;

    if ($pdo === null) {
        try {
            if (!DB_NAME || !DB_USER) {
                throw new Exception("Database env vars missing (DB_NAME/DB_USER).");
            }

            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            if (API_DEBUG) {
                throw new Exception("Database connection failed: " . $e->getMessage());
            }
            throw new Exception("Database connection failed");
        }
    }

    return $pdo;
}

// ----------------------
// CORS
// ----------------------
function handleCORS() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin && in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Vary: Origin");
    } else {
        // Si pas d'Origin (appel serveur->serveur), ok.
        // Sinon, on refuse les origines non listées (plus safe).
        if ($origin) {
            header("Access-Control-Allow-Origin: https://sunbox-mauritius.com");
            header("Vary: Origin");
        }
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    header("Content-Type: application/json; charset=UTF-8");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// ----------------------
// Helpers
// ----------------------
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function errorResponse($message, $statusCode = 400) {
    jsonResponse(['error' => $message, 'success' => false], $statusCode);
}

function successResponse($data = null, $message = 'Success') {
    $response = ['success' => true, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    jsonResponse($response);
}

function getRequestBody() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function validateRequired($data, $fields) {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            $missing[] = $field;
        }
    }
    if (!empty($missing)) {
        errorResponse("Missing required fields: " . implode(', ', $missing));
    }
}

function sanitize($value) {
    if (is_string($value)) {
        return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
    }
    return $value;
}

function generateQuoteReference() {
    $date = date('Ymd');
    $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 4));
    return "SBX-{$date}-{$random}";
}

function requireAdmin() {
    startSession();
    if (empty($_SESSION['is_admin'])) {
        errorResponse('Unauthorized (admin only)', 401);
    }
}
