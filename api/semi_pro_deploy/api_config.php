<?php
declare(strict_types=1);

/**
 * Semi-Pro Site API config
 *
 * The semi-pro site is a SUBFOLDER of the Sunbox installation:
 *   sunbox-root/pros/<slug>/  (e.g. sunbox-root/pros/semi-pro/)
 *
 * DB access strategy:
 *  - Sunbox DB : credentials read DIRECTLY from sunbox-root/.env via
 *    parseSunboxRootEnv() — used for user authentication and model data.
 *  - Semi-Pro DB: a single SHARED database for ALL semi-pro users.
 *    Name comes from local .env (DB_NAME). Host/user/pass from Sunbox root .env.
 *
 * Key difference from pro_deploy: NO single SUNBOX_USER_ID — multiple users
 * share this site. The logged-in user is tracked via $_SESSION['semi_pro_user_id'].
 */

/** Deployed file version — must match SEMI_PRO_FILE_VERSION in sunbox api/index.php. */
define('SEMI_PRO_FILE_VERSION', '1.0.1');

/**
 * Parse a single .env file from disk, bypassing getenv() entirely.
 */
function semiProParseEnvFile(string $path): array
{
    $result = [];
    if (!is_file($path) || !is_readable($path)) return $result;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) return $result;
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || $line[0] === ';') continue;
        if (strpos($line, '=') === false) continue;
        $parts = explode('=', $line, 2);
        $k = trim($parts[0]);
        $v = trim($parts[1]);
        if (strlen($v) >= 2 && (
            ($v[0] === '"'  && substr($v, -1) === '"')  ||
            ($v[0] === "'" && substr($v, -1) === "'")
        )) {
            $v = substr($v, 1, -1);
        }
        $result[$k] = $v;
    }
    return $result;
}

/**
 * Parse the Sunbox root .env (3 levels up from this file's location at
 * sunbox-root/pros/<slug>/api/config.php).
 * __DIR__ = sunbox-root/pros/<slug>/api/ → up 3 → sunbox-root/
 */
function parseSunboxRootEnv(): array
{
    static $parsed = null;
    if ($parsed !== null) return $parsed;
    // __FILE__ lives at: sunbox-root/pros/<slug>/api/config.php
    // 4 dirname() calls: api/ → <slug>/ → pros/ → sunbox-root/
    $candidates = [
        dirname(__DIR__, 3) . '/.env',
        dirname(__DIR__, 3) . '/api/.env',
        dirname(__DIR__, 4) . '/.env',
    ];
    foreach ($candidates as $path) {
        $env = semiProParseEnvFile($path);
        if (!empty($env)) { $parsed = $env; return $parsed; }
    }
    $parsed = [];
    return $parsed;
}

/**
 * Read a value from the local .env file (in the same dir as this script's parent).
 */
function env(string $key, string $default = ''): string
{
    static $local = null;
    if ($local === null) {
        // Local .env is one level above api/ (the site root: pros/<slug>/.env)
        $local = semiProParseEnvFile(dirname(__DIR__, 1) . '/.env');
    }
    return $local[$key] ?? $default;
}

define('API_DEBUG', env('API_DEBUG', 'false') === 'true');

/** PDO connection to the Sunbox main database (for auth + models). */
function getSunboxDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $e = parseSunboxRootEnv();
    $host   = $e['DB_HOST'] ?? 'localhost';
    $dbName = $e['DB_NAME'] ?? '';
    $user   = $e['DB_USER'] ?? '';
    $pass   = $e['DB_PASS'] ?? '';
    if (!$dbName || !$user) {
        throw new \RuntimeException('Sunbox root .env introuvable ou incomplet (DB_HOST/DB_NAME/DB_USER/DB_PASS manquants).');
    }
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbName};charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
         PDO::ATTR_EMULATE_PREPARES   => false]
    );
    return $pdo;
}

/** PDO connection to the shared semi-pro database (quotes, contacts). */
function getSemiProDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $e = parseSunboxRootEnv();
    $host   = $e['DB_HOST'] ?? 'localhost';
    $user   = $e['DB_USER'] ?? '';
    $pass   = $e['DB_PASS'] ?? '';
    $dbName = env('DB_NAME', '');
    if (!$dbName || !$user) {
        throw new \RuntimeException('DB_NAME manquant dans .env du site semi-pro. Configurez la base de données partagée.');
    }
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbName};charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
         PDO::ATTR_EMULATE_PREPARES   => false]
    );
    return $pdo;
}

/**
 * Return absolute Sunbox base URL (e.g. https://sunbox-mauritius.com).
 */
function sunboxBaseUrl(): string
{
    static $base = null;
    if ($base !== null) return $base;
    $e = parseSunboxRootEnv();
    $base = isset($e['APP_URL']) ? rtrim($e['APP_URL'], '/') : 'https://sunbox-mauritius.com';
    return $base;
}

function sunboxAbsUrl(?string $path): ?string
{
    if ($path === null || $path === '') return $path;
    if (strpos($path, '://') !== false) return $path;
    if (strlen($path) > 0 && $path[0] === '/') return sunboxBaseUrl() . $path;
    return $path;
}

function makeModelUrlsAbsolute(array $model, string $sunboxBase): array
{
    foreach (['image_url', 'plan_url'] as $key) {
        if (!isset($model[$key]) || $model[$key] === '' || $model[$key] === null) continue;
        $url = (string)$model[$key];
        if (strpos($url, '://') !== false) continue;
        if (strlen($url) > 0 && $url[0] === '/') {
            $model[$key] = rtrim($sunboxBase, '/') . $url;
        }
    }
    return $model;
}

/**
 * Get the currently authenticated semi-pro user ID from session.
 */
function getSemiProUserId(): int
{
    return (int)($_SESSION['semi_pro_user_id'] ?? 0);
}

/**
 * Require authenticated semi-pro user — halt with 401 if not logged in.
 */
function requireSemiPro(): void
{
    startSession();
    if (empty($_SESSION['is_pro_user']) || empty($_SESSION['semi_pro_user_id'])) {
        errorResponse('Non authentifié.', 401);
    }
}

/**
 * Fetch all models from Sunbox DB.
 * If $userId > 0, filters to only models whose type slug is in the user's allowed list.
 */
function fetchModels(int $userId = 0): array
{
    $empty = ['models' => [], 'catalog_mode' => false, 'credits' => 0, 'logo_url' => '', 'company_name' => ''];
    try {
        $sdb = getSunboxDB();
        $sunboxAppUrl = sunboxBaseUrl();

        // Determine allowed model type slugs for this user (null = all allowed)
        $allowedSlugs = null;
        if ($userId > 0) {
            $profileStmt = $sdb->prepare("SELECT allowed_model_type_slugs FROM professional_profiles WHERE user_id = ? LIMIT 1");
            $profileStmt->execute([$userId]);
            $profileData = $profileStmt->fetch();
            if ($profileData && !empty($profileData['allowed_model_type_slugs'])) {
                $allowedSlugs = json_decode($profileData['allowed_model_type_slugs'], true);
                if (!is_array($allowedSlugs) || empty($allowedSlugs)) $allowedSlugs = null;
            }
        }

        if ($allowedSlugs !== null) {
            $placeholders = implode(',', array_fill(0, count($allowedSlugs), '?'));
            $stmt = $sdb->prepare("
                SELECT m.*, mt.label AS type_label
                FROM models m
                LEFT JOIN model_types mt ON mt.slug = m.type
                WHERE m.is_active = 1 AND m.type IN ($placeholders)
                ORDER BY m.display_order ASC, m.name ASC
            ");
            $stmt->execute($allowedSlugs);
        } else {
            $stmt = $sdb->query("
                SELECT m.*, mt.label AS type_label
                FROM models m
                LEFT JOIN model_types mt ON mt.slug = m.type
                WHERE m.is_active = 1
                ORDER BY m.display_order ASC, m.name ASC
            ");
        }
        $models = $stmt->fetchAll();

        // Fetch active discounts (global)
        $discStmt = $sdb->query("
            SELECT id, name, discount_type, discount_value, apply_to, model_ids
            FROM discounts
            WHERE is_active = 1
              AND (start_date IS NULL OR start_date <= CURDATE())
              AND (end_date IS NULL OR end_date >= CURDATE())
        ");
        $allDiscounts = $discStmt->fetchAll();
        foreach ($allDiscounts as &$d) {
            $d['model_ids'] = !empty($d['model_ids']) ? json_decode($d['model_ids'], true) : [];
        }
        unset($d);

        $result = [];
        foreach ($models as $model) {
            $mid = (int)$model['id'];
            $model['is_active']             = (bool)($model['is_active'] ?? false);
            $model['has_overflow']          = (bool)($model['has_overflow'] ?? false);
            $model['surface_m2']            = (float)($model['surface_m2'] ?? 0);
            $model['bedrooms']              = (int)($model['bedrooms'] ?? 0);
            $model['bathrooms']             = (int)($model['bathrooms'] ?? 0);
            $model['container_20ft_count']  = (int)($model['container_20ft_count'] ?? 0);
            $model['container_40ft_count']  = (int)($model['container_40ft_count'] ?? 0);
            $model['display_order']         = (int)($model['display_order'] ?? 0);
            $model['features']              = isset($model['features']) && $model['features']
                ? json_decode($model['features'], true)
                : [];

            try {
                $planRow  = $sdb->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type='plan'  ORDER BY is_primary DESC, id DESC LIMIT 1");
                $photoRow = $sdb->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type='photo' ORDER BY is_primary DESC, id DESC LIMIT 1");
                $planRow->execute([$mid]);
                $photoRow->execute([$mid]);
                $plan  = $planRow->fetch();
                $photo = $photoRow->fetch();
                if ($plan  && $plan['file_path'])  $model['plan_url']  = '/' . ltrim($plan['file_path'],  '/');
                if ($photo && $photo['file_path']) $model['image_url'] = '/' . ltrim($photo['file_path'], '/');
                elseif (!empty($model['image_url'])) $model['image_url'] = '/' . ltrim($model['image_url'], '/');
            } catch (\Throwable $ignored) {}

            $model = makeModelUrlsAbsolute($model, $sunboxAppUrl);

            $modelDiscs = array_values(array_filter($allDiscounts, function ($d) use ($mid) {
                return empty($d['model_ids']) || in_array($mid, $d['model_ids'], true);
            }));
            $model['active_discounts'] = $modelDiscs;

            $result[] = $model;
        }

        return ['models' => $result, 'catalog_mode' => false, 'credits' => 0, 'logo_url' => '', 'company_name' => env('COMPANY_NAME', 'Semi-Pro ERP')];
    } catch (\Throwable $e) {
        error_log('SemiProSite fetchModels error: ' . $e->getMessage());
        return array_merge($empty, ['_error' => $e->getMessage()]);
    }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function handleCORS(): void
{
    $appUrl = (string)env('APP_URL', '');
    $host   = $appUrl ? (parse_url($appUrl, PHP_URL_HOST) ?: '') : '';
    $allowed = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];
    if ($host) {
        $allowed[] = 'https://' . $host;
        $allowed[] = 'https://www.' . $host;
    }
    // Also allow the custom domain configured for this semi-pro site.
    // The API URL injected by index.php uses the HTTP_HOST so requests are same-origin;
    // this is kept here as a defence-in-depth safety net.
    $customDomain = trim((string)env('DOMAIN', ''));
    if ($customDomain) {
        if (strpos($customDomain, 'www.') === 0) {
            $allowed[] = 'https://' . $customDomain;
            $allowed[] = 'https://' . substr($customDomain, 4);
        } else {
            $allowed[] = 'https://' . $customDomain;
            $allowed[] = 'https://www.' . $customDomain;
        }
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
    if (empty($_SESSION['is_pro_user']) || empty($_SESSION['semi_pro_user_id'])) {
        errorResponse('Non authentifié.', 401);
    }
}

function jsonResponse($data, $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit(); }
function errorResponse($msg, $code = 400): void { jsonResponse(['error' => $msg, 'success' => false], $code); }
function successResponse($data = null): void { $r = ['success' => true]; if ($data !== null) $r['data'] = $data; jsonResponse($r); }
function getRequestBody(): array { return json_decode(file_get_contents('php://input'), true) ?? []; }
function validateRequired($data, $fields): void {
    $missing = array_filter($fields, fn($f) => !isset($data[$f]) || $data[$f] === '');
    if (!empty($missing)) errorResponse("Champs manquants: " . implode(', ', $missing));
}

function sanitize($value)
{
    if (is_string($value)) return strip_tags(trim($value));
    return $value;
}

function generateReference(string $prefix = 'SPQ'): string
{
    return $prefix . '-' . date('Ymd') . '-' . strtoupper(substr(md5(uniqid('', true)), 0, 6));
}

function getQuotePrefix(string $modelType, bool $isFreeQuote = false, bool $isPro = false): string
{
    if ($isFreeQuote) return 'WFQ';
    $base = 'S'; // S = Semi-Pro (all semi-pro quotes use S prefix)
    return match($modelType) {
        'container' => $base . 'CQ',
        'pool'      => $base . 'PQ',
        default     => $base . strtoupper(substr($modelType, 0, 1)) . 'Q',
    };
}
