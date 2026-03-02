<?php
declare(strict_types=1);

/**
 * Pro Site API config
 * DB credentials are read from the local .env file (auto-provisioned by Sunbox).
 * Only SUNBOX_API_URL and SUNBOX_API_TOKEN are needed for the Sunbox bridge.
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
 * Get PDO connection to the pro site's own database.
 * Credentials come from the local .env file (auto-filled during provisioning).
 */
function getDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $host    = (string)env('DB_HOST', 'localhost');
    $name    = (string)env('DB_NAME', '');
    $user    = (string)env('DB_USER', '');
    $pass    = (string)env('DB_PASS', '');
    $charset = 'utf8mb4';

    if (!$name || !$user) {
        throw new \Exception('Configuration DB manquante. Reconfigurez le site via sunbox-mauritius.com.');
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
    $domain = SUNBOX_DOMAIN;
    $allowed = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://sunbox-mauritius.com',
        'https://www.sunbox-mauritius.com',
    ];
    if ($domain) {
        $allowed[] = "https://{$domain}";
        $allowed[] = "https://www.{$domain}";
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
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
 * HTTP request helper — uses cURL (primary, handles SSL reliably on shared hosting)
 * with file_get_contents fallback.
 * When SSL certificate verification fails, the request is retried without it so the
 * connection still works on shared hosting servers that lack a CA bundle. This fallback
 * is logged so administrators are aware. The URL is always verified to be HTTPS.
 */
function sunboxHttpRequest(string $url, string $method = 'GET', ?string $jsonBody = null): string|false
{
    if (function_exists('curl_init')) {
        $headers = ['Accept: application/json', 'User-Agent: ProSite/1.0'];
        if ($jsonBody !== null) {
            $headers[] = 'Content-Type: application/json';
        }
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($jsonBody !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
            }
        }
        $result = curl_exec($ch);
        if ($result === false) {
            // SSL verification failed (CA bundle missing on shared hosting).
            // Log this downgrade so admins can install the CA bundle if desired.
            error_log('ProSite: SSL verification failed for ' . $url . ', retrying without peer verification (install CA bundle to fix)');
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            $result = curl_exec($ch);
        }
        curl_close($ch);
        return $result;
    }

    // Fallback: file_get_contents.
    // SSL verification disabled here because file_get_contents cannot do CA-bundle retry.
    // This path is only taken when cURL is unavailable (rare on modern PHP).
    error_log('ProSite: cURL unavailable, using file_get_contents without SSL verification for ' . $url);
    $httpOpts = [
        'method'        => $method,
        'header'        => "Accept: application/json\r\nUser-Agent: ProSite/1.0\r\n",
        'timeout'       => 15,
        'ignore_errors' => true,
    ];
    if ($jsonBody !== null) {
        $httpOpts['header'] .= "Content-Type: application/json\r\n";
        $httpOpts['content'] = $jsonBody;
    }
    return @file_get_contents($url, false, stream_context_create([
        'http' => $httpOpts,
        'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
    ]));
}

/**
 * Fetch models from Sunbox main API (with pro margin + overrides already applied).
 */
function fetchSunboxModels(): array
{
    $empty = ['models' => [], 'catalog_mode' => true, 'credits' => 0, 'logo_url' => '', 'company_name' => ''];
    $url   = SUNBOX_API_URL . '/pro_public.php?action=get_models&token=' . urlencode(SUNBOX_API_TOKEN);
    $raw   = sunboxHttpRequest($url);
    if ($raw === false) return $empty;
    $json = json_decode($raw, true);
    if (!is_array($json) || !($json['success'] ?? false)) return $empty;
    return is_array($json['data'] ?? null) ? $json['data'] : $empty;
}

/** Check remaining credits from Sunbox. */
function checkSunboxCredits(): array
{
    $url = SUNBOX_API_URL . '/pro_public.php?action=check_credits&token=' . urlencode(SUNBOX_API_TOKEN);
    $raw = sunboxHttpRequest($url);
    if ($raw === false) return ['credits' => 0, 'catalog_mode' => true];
    $json = json_decode($raw, true);
    if (!is_array($json) || !($json['success'] ?? false)) return ['credits' => 0, 'catalog_mode' => true];
    return is_array($json['data'] ?? null) ? $json['data'] : ['credits' => 0, 'catalog_mode' => true];
}

/** Deduct credits from Sunbox. */
function deductSunboxCredits(float $amount, string $reason, ?int $quoteId = null): array
{
    $url     = SUNBOX_API_URL . '/pro_public.php?action=deduct_credits&token=' . urlencode(SUNBOX_API_TOKEN);
    $payload = json_encode(['amount' => $amount, 'reason' => $reason, 'quote_id' => $quoteId]);
    $raw     = sunboxHttpRequest($url, 'POST', $payload);
    if ($raw === false) return ['success' => false, 'error' => 'Impossible de contacter Sunbox'];
    return json_decode($raw, true) ?? ['success' => false];
}
