<?php
/**
 * SUNBOX MAURITIUS - API config
 * Path: public_html/api/config.php
 *
 * IMPORTANT:
 * - Ne mets AUCUN secret ici.
 * - Les secrets restent dans /home/mauriti2/sunbox-mauritius.com/.env (non versionné).
 */

/**
 * ------------------------------------------------------------
 * 1) Load .env (manual loader, no Composer required)
 * ------------------------------------------------------------
 */
function loadEnvFile(): void
{
    // config.php est dans .../api/config.php
    // dirname(__DIR__) = .../ (racine du site) -> donc .env est là
    $candidates = [
        dirname(__DIR__) . '/.env',          // /home/mauriti2/sunbox-mauritius.com/.env  ✅ ton cas
        __DIR__ . '/.env',                   // /home/.../api/.env
        dirname(__DIR__, 2) . '/.env',       // /home/mauriti2/.env (au cas où)
    ];

    $loaded = '';
    foreach ($candidates as $path) {
        if (is_file($path) && is_readable($path)) {
            $loaded = $path;
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!$lines) break;

            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, ';')) continue;
                if (!str_contains($line, '=')) continue;

                [$key, $val] = explode('=', $line, 2);
                $key = trim($key);
                $val = trim($val);

                // enlève quotes "..." ou '...'
                if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                    (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                    $val = substr($val, 1, -1);
                }

                // ne pas écraser une variable déjà définie par le serveur
                $already = getenv($key);
                if ($already !== false && $already !== '') continue;

                // set env
                @putenv($key . '=' . $val);
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
            break;
        }
    }

    // utile pour tester (sans exposer les secrets)
    $GLOBALS['ENV_FILE_LOADED'] = $loaded;
}

loadEnvFile();

/**
 * Helper: read env from getenv/$_ENV/$_SERVER
 */
function env(string $key, $default = null)
{
    $v = getenv($key);
    if ($v !== false && $v !== '') return $v;
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') return $_ENV[$key];
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') return $_SERVER[$key];
    return $default;
}

function envBool(string $key, bool $default = false): bool
{
    $v = strtolower((string)env($key, $default ? 'true' : 'false'));
    return in_array($v, ['1','true','yes','on'], true);
}

/**
 * ------------------------------------------------------------
 * 2) Settings (NO secrets here)
 * ------------------------------------------------------------
 */
define('API_DEBUG', envBool('API_DEBUG', false));

define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_NAME', env('DB_NAME', ''));
define('DB_USER', env('DB_USER', ''));
define('DB_PASS', env('DB_PASS', ''));
define('DB_CHARSET', env('DB_CHARSET', 'utf8mb4'));

// CORS allowed origins (keep as you had)
define('ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://sunbox-mauritius.com',
    'https://www.sunbox-mauritius.com',
    'https://famous.ai',
]);

/**
 * ------------------------------------------------------------
 * 3) DB connection
 * ------------------------------------------------------------
 */
function getDB() {
    static $pdo = null;

    if ($pdo === null) {
        if (!DB_NAME || !DB_USER) {
            throw new Exception("Database env missing (DB_NAME/DB_USER).");
        }
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            if (API_DEBUG) throw new Exception("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }

    return $pdo;
}

/**
 * ------------------------------------------------------------
 * 4) CORS (session-friendly)
 * ------------------------------------------------------------
 */
function handleCORS() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin && in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Vary: Origin");
    } else {
        // same-origin requests don't need CORS; but keep permissive for non-browser tools
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

/**
 * ------------------------------------------------------------
 * 5) Session helper
 * ------------------------------------------------------------
 */
function startSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? '') == 443);

    // SameSite: if calling API from another domain with credentials -> needs None
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host   = $_SERVER['HTTP_HOST'] ?? '';
    $sameSite = 'Lax';

    if ($origin) {
        $originHost = parse_url($origin, PHP_URL_HOST) ?: '';
        if ($originHost && $host && strcasecmp($originHost, $host) !== 0) {
            $sameSite = 'None'; // cross-site + credentials
        }
    }

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);

    session_start();
}

/**
 * ------------------------------------------------------------
 * 6) Response helpers
 * ------------------------------------------------------------
 */
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

function generateQuoteReference() {
    $date = date('Ymd');
    $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 4));
    return "SBX-{$date}-{$random}";
}
