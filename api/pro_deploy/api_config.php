<?php
declare(strict_types=1);

/**
 * Pro Site API config
 * DB credentials are NOT stored locally.
 * They are fetched at runtime from Sunbox (encrypted at rest) via the API token.
 * Only SUNBOX_API_URL and SUNBOX_API_TOKEN are needed in .env.
 */

function loadEnvFile(): void
{
    $candidates = [
        dirname(__DIR__) . '/.env',
        __DIR__ . '/.env',
        dirname(__DIR__, 2) . '/.env',
    ];

    foreach ($candidates as $path) {
        if (is_file($path) && is_readable($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!$lines) break;
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, ';')) continue;
                if (!str_contains($line, '=')) continue;
                [$key, $val] = explode('=', $line, 2);
                $key = trim($key);
                $val = trim($val);
                if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                    (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                    $val = substr($val, 1, -1);
                }
                if (getenv($key) !== false && getenv($key) !== '') continue;
                @putenv($key . '=' . $val);
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
            break;
        }
    }
}

loadEnvFile();

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
    return in_array($v, ['1', 'true', 'yes', 'on'], true);
}

define('API_DEBUG',        envBool('API_DEBUG', false));
define('SUNBOX_API_URL',   rtrim((string)env('SUNBOX_API_URL', 'https://sunbox-mauritius.com/api'), '/'));
define('SUNBOX_API_TOKEN', (string)env('SUNBOX_API_TOKEN', ''));
define('SUNBOX_DOMAIN',    (string)env('SUNBOX_DOMAIN', ''));
define('VAT_RATE',         (float)env('VAT_RATE', 15));

/**
 * Fetch DB credentials from Sunbox main API (server-to-server, encrypted at rest).
 * Result is cached in a static variable for the duration of this PHP request.
 */
function getDbConfig(): array
{
    static $cfg = null;
    if ($cfg !== null) return $cfg;

    $url  = SUNBOX_API_URL . '/pro_public.php?action=get_db_config&token=' . urlencode(SUNBOX_API_TOKEN);
    $opts = [
        'http' => [
            'method'  => 'GET',
            'header'  => "Accept: application/json\r\nUser-Agent: ProSite/1.0\r\n",
            'timeout' => 5,
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ];

    $raw = @file_get_contents($url, false, stream_context_create($opts));
    if ($raw === false) {
        throw new \Exception('Impossible de récupérer la configuration de la base de données depuis Sunbox.');
    }
    $json = json_decode($raw, true);
    if (!$json || !($json['success'] ?? false)) {
        throw new \Exception($json['error'] ?? 'Erreur de configuration DB Sunbox.');
    }
    $cfg = $json['data'];
    return $cfg;
}

/**
 * Get PDO connection to the pro site's own database.
 * Credentials are fetched from Sunbox — no local DB config needed.
 */
function getDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $cfg = getDbConfig();
    $host    = $cfg['host']    ?? 'localhost';
    $name    = $cfg['name']    ?? '';
    $user    = $cfg['user']    ?? '';
    $pass    = $cfg['pass']    ?? '';
    $charset = $cfg['charset'] ?? 'utf8mb4';

    if (!$name || !$user) {
        throw new \Exception('Configuration DB incomplète.');
    }

    $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

function handleCORS(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $domain = SUNBOX_DOMAIN;
    $allowed = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        "https://$domain",
        "https://www.$domain",
    ];
    if ($origin && in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Vary: Origin");
    }
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Content-Type: application/json; charset=UTF-8");
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(200); exit(); }
}

function startSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') == 443);
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $isHttps, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

function requireAdmin(): void
{
    startSession();
    if (empty($_SESSION['is_admin'])) { errorResponse('Unauthorized', 401); }
}

function jsonResponse($data, $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit(); }
function errorResponse($msg, $code = 400): void { jsonResponse(['error' => $msg, 'success' => false], $code); }
function successResponse($data = null): void { $r = ['success' => true]; if ($data !== null) $r['data'] = $data; jsonResponse($r); }
function getRequestBody(): array { return json_decode(file_get_contents('php://input'), true) ?? []; }
function validateRequired($data, $fields): void {
    $missing = array_filter($fields, fn($f) => !isset($data[$f]) || $data[$f] === '');
    if (!empty($missing)) errorResponse("Missing: " . implode(', ', $missing));
}

function generateReference(): string
{
    return 'PRO-' . date('Ymd') . '-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 4));
}

/**
 * Fetch models from Sunbox main API.
 * Returns an array of models with pro-adjusted pricing already applied.
 * Also returns catalog_mode (true if credits = 0).
 */
function fetchSunboxModels(): array
{
    $url = SUNBOX_API_URL . '/pro_public.php?action=get_models&token=' . urlencode(SUNBOX_API_TOKEN);
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\nUser-Agent: ProSite/1.0\r\n",
            'timeout' => 10,
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ];
    $raw = @file_get_contents($url, false, stream_context_create($opts));
    if ($raw === false) return ['models' => [], 'catalog_mode' => true, 'credits' => 0, 'logo_url' => '', 'company_name' => ''];
    $json = json_decode($raw, true);
    if (!$json || !$json['success']) return ['models' => [], 'catalog_mode' => true, 'credits' => 0, 'logo_url' => '', 'company_name' => ''];
    return $json['data'];
}

/**
 * Check credits from Sunbox main API.
 */
function checkSunboxCredits(): array
{
    $url = SUNBOX_API_URL . '/pro_public.php?action=check_credits&token=' . urlencode(SUNBOX_API_TOKEN);
    $opts = ['http' => ['method' => 'GET', 'timeout' => 5]];
    $raw = @file_get_contents($url, false, stream_context_create($opts));
    if ($raw === false) return ['credits' => 0, 'catalog_mode' => true];
    $json = json_decode($raw, true);
    if (!$json || !$json['success']) return ['credits' => 0, 'catalog_mode' => true];
    return $json['data'];
}

/**
 * Deduct credits from Sunbox main API.
 */
function deductSunboxCredits(float $amount, string $reason, ?int $quoteId = null): array
{
    $url = SUNBOX_API_URL . '/pro_public.php?action=deduct_credits&token=' . urlencode(SUNBOX_API_TOKEN);
    $payload = json_encode(['amount' => $amount, 'reason' => $reason, 'quote_id' => $quoteId]);
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'content' => $payload,
            'timeout' => 10,
        ],
    ];
    $raw = @file_get_contents($url, false, stream_context_create($opts));
    if ($raw === false) return ['success' => false, 'error' => 'Impossible de contacter Sunbox'];
    return json_decode($raw, true) ?? ['success' => false];
}
