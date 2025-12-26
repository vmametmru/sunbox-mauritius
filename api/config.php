<?php
/**
 * SUNBOX MAURITIUS - API Configuration
 *
 * IMPORTANT:
 * - Keep secrets in /.env on the server (NOT in GitHub).
 * - This file reads the .env located at the project root:
 *      public_html/.env
 * - This file is located at:
 *      public_html/api/config.php
 */

/* -------------------------------------------------------
   Load .env (manual parser, no external library needed)
-------------------------------------------------------- */
$PROJECT_ROOT = dirname(__DIR__);               // public_html
$ENV_FILE     = $PROJECT_ROOT . '/.env';        // public_html/.env

if (file_exists($ENV_FILE) && is_readable($ENV_FILE)) {
    $lines = file($ENV_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!str_contains($line, '=')) continue;

        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v);

        // strip optional surrounding quotes
        $v = trim($v, "\"'");

        $_ENV[$k] = $v;
        $_SERVER[$k] = $v;
        putenv("$k=$v");
    }
}

function envv(string $key, $default = null) {
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') return $_ENV[$key];
    $v = getenv($key);
    if ($v !== false && $v !== '') return $v;
    return $default;
}

/* -------------------------------------------------------
   API Debug
-------------------------------------------------------- */
define('API_DEBUG', filter_var(envv('API_DEBUG', 'false'), FILTER_VALIDATE_BOOLEAN));

/* -------------------------------------------------------
   Database credentials (from .env)
-------------------------------------------------------- */
define('DB_HOST', envv('DB_HOST', 'localhost'));
define('DB_NAME', envv('DB_NAME', ''));
define('DB_USER', envv('DB_USER', ''));
define('DB_PASS', envv('DB_PASS', ''));
define('DB_CHARSET', envv('DB_CHARSET', 'utf8mb4'));

/* -------------------------------------------------------
   CORS settings
   (Allowed origins list stays in code, no secrets here)
-------------------------------------------------------- */
define('ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://sunbox-mauritius.com',
    'https://www.sunbox-mauritius.com',
    'https://famous.ai',
]);

/**
 * Handle CORS
 * - Only echoes back allowed origins
 * - Never returns "*" unless no origin header is present
 */
function handleCORS() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin && in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header("Vary: Origin");
        // If you use cookies/sessions, enable this:
        // header("Access-Control-Allow-Credentials: true");
    } else {
        // If there's no Origin header (e.g. curl/server-to-server), do not block.
        // We avoid sending "*" when an origin header exists but is not allowed.
        if (!$origin) {
            header("Access-Control-Allow-Origin: *");
        }
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

/* -------------------------------------------------------
   Email / SMTP config (from .env)
-------------------------------------------------------- */
$SMTP_CONFIG = [
    'host'       => envv('SMTP_HOST', 'mail.sunbox-mauritius.com'),
    'port'       => (int) envv('SMTP_PORT', '465'),
    'username'   => envv('SMTP_USER', 'info@sunbox-mauritius.com'),
    'password'   => envv('SMTP_PASS', ''),
    'secure'     => envv('SMTP_SECURE', 'ssl'),
    'from_email' => envv('SMTP_FROM_EMAIL', 'info@sunbox-mauritius.com'),
    'from_name'  => envv('SMTP_FROM_NAME', 'Sunbox Ltd'),
];

/* -------------------------------------------------------
   PDO connection
-------------------------------------------------------- */
function getDB() {
    static $pdo = null;

    if ($pdo === null) {
        try {
            if (DB_NAME === '' || DB_USER === '') {
                throw new Exception("Database env vars missing (DB_NAME/DB_USER).");
            }

            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (Throwable $e) {
            if (API_DEBUG) {
                throw new Exception("Database connection failed: " . $e->getMessage());
            }
            throw new Exception("Database connection failed");
        }
    }

    return $pdo;
}

/* -------------------------------------------------------
   JSON helpers
-------------------------------------------------------- */
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
    if ($data !== null) $response['data'] = $data;
    jsonResponse($response);
}

/* -------------------------------------------------------
   Request helpers
-------------------------------------------------------- */
function getRequestBody() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function validateRequired($data, $fields) {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') $missing[] = $field;
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

/* -------------------------------------------------------
   Utility
-------------------------------------------------------- */
function generateQuoteReference() {
    $date = date('Ymd');
    $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 4));
    return "SBX-{$date}-{$random}";
}
