<?php
declare(strict_types=1);

/**
 * Pro Site API config
 *
 * The pro site is a SUBFOLDER of the Sunbox installation:
 *   sunbox-root/pros/<domain>/
 *
 * DB access strategy:
 *  - Sunbox DB: credentials read DIRECTLY from sunbox-root/.env via
 *    parseSunboxRootEnv() — never via getenv() which is polluted by
 *    cPanel/Apache environment variables on shared hosting.
 *  - Pro DB: name comes from pro .env (one level up from api/).
 *    Host/user/pass come from the same Sunbox root .env (same server).
 */

/** Deployed file version — must match PRO_FILE_VERSION in sunbox api/index.php. */
define('PRO_FILE_VERSION', '1.2.0');

/**
 * Read the Sunbox root .env directly from disk — bypasses getenv() entirely.
 * Immune to cPanel/Apache pre-set environment variables.
 *
 * Path: api/config.php is at sunbox-root/pros/<domain>/api/config.php
 *       dirname(__DIR__, 3): api → domain → pros → sunbox-root
 */
function parseSunboxRootEnv(): array
{
    static $cache = null;
    if ($cache !== null) return $cache;
    $path = dirname(__DIR__, 3) . '/.env';
    $cache = [];
    if (!is_file($path) || !is_readable($path)) return $cache;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || $line[0] === ';') continue;
        if (!str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v);
        if (strlen($v) >= 2 && (
            ($v[0] === '"'  && substr($v, -1) === '"')  ||
            ($v[0] === "'" && substr($v, -1) === "'")
        )) {
            $v = substr($v, 1, -1);
        }
        $cache[$k] = $v;
    }
    return $cache;
}

/** Load the pro site's own .env (one level up from api/). */
function loadEnvFiles(): void
{
    $path = dirname(__DIR__) . '/.env';
    if (!is_file($path) || !is_readable($path)) return;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, ';')) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val);
        if (strlen($val) >= 2 && (
            ($val[0] === '"'  && substr($val, -1) === '"')  ||
            ($val[0] === "'" && substr($val, -1) === "'")
        )) {
            $val = substr($val, 1, -1);
        }
        @putenv("$key=$val");
        $_ENV[$key]    = $val;
        $_SERVER[$key] = $val;
    }
}

loadEnvFiles();

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

define('API_DEBUG',      envBool('API_DEBUG', false));
define('SUNBOX_USER_ID', (int)env('SUNBOX_USER_ID', 0));
define('VAT_RATE',       (float)env('VAT_RATE', 15));

// ── Database connections ──────────────────────────────────────────────────────

/**
 * PDO connection to the pro site's own database.
 * DB_NAME comes from pro .env; DB_HOST/USER/PASS from Sunbox root .env (via parseSunboxRootEnv).
 */
function getDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $e    = parseSunboxRootEnv();
    $host = $e['DB_HOST'] ?? 'localhost';
    $user = $e['DB_USER'] ?? '';
    $pass = $e['DB_PASS'] ?? '';
    $name = (string)env('DB_NAME', '');   // Pro DB name from pro .env
    if (!$name) {
        throw new \Exception('DB_NAME manquant dans le .env du site pro. Configurez la BD via sunbox-mauritius.com.');
    }
    if (!$user) {
        throw new \Exception('DB_USER introuvable dans le .env Sunbox racine (' . dirname(__DIR__, 3) . '/.env).');
    }
    $pdo = new PDO("mysql:host={$host};dbname={$name};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

/**
 * PDO connection to the Sunbox main database.
 * Always reads credentials directly from sunbox-root/.env — immune to PHP env state.
 */
function getSunboxDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $e    = parseSunboxRootEnv();
    $host = $e['DB_HOST'] ?? 'localhost';
    $name = $e['DB_NAME'] ?? '';
    $user = $e['DB_USER'] ?? '';
    $pass = $e['DB_PASS'] ?? '';
    if (!$name || !$user) {
        $envPath = dirname(__DIR__, 3) . '/.env';
        throw new \Exception(
            "Sunbox DB inaccessible: DB_NAME='{$name}', DB_USER='{$user}'. "
            . "Fichier .env lu: {$envPath}. "
            . "Vérifiez que le site pro est dans sunbox-root/pros/<domaine>/."
        );
    }
    $pdo = new PDO("mysql:host={$host};dbname={$name};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

// ── Sunbox data helpers (direct DB — no HTTP) ─────────────────────────────────

/** Returns the professional_profiles row for this pro site's user. */
function getProProfile(): array
{
    if (!SUNBOX_USER_ID) return [];
    $db = getSunboxDB();
    $stmt = $db->prepare("
        SELECT pp.*, u.name AS user_name
        FROM professional_profiles pp
        JOIN users u ON u.id = pp.user_id
        WHERE pp.user_id = ? AND pp.is_active = 1
        LIMIT 1
    ");
    $stmt->execute([SUNBOX_USER_ID]);
    return $stmt->fetch() ?: [];
}

/**
 * Fetch models from the Sunbox DB with this pro's price overrides applied.
 * Returns: { models: [...], catalog_mode: bool, credits: float, logo_url: string, company_name: string }
 */
function fetchModels(): array
{
    $empty = ['models' => [], 'catalog_mode' => true, 'credits' => 0, 'logo_url' => '', 'company_name' => ''];
    try {
        $db      = getSunboxDB();
        $profile = getProProfile();
        if (!$profile) return $empty;

        $userId  = SUNBOX_USER_ID;
        $margin  = (float)($profile['sunbox_margin_percent'] ?? 0);
        $credits = (float)($profile['credits'] ?? 0);

        // Active models with BOQ-calculated base price
        $stmt = $db->prepare("
            SELECT m.*,
                COALESCE((
                    SELECT SUM(bl.sale_price_ht * bl.qty)
                    FROM boq_lines bl
                    JOIN boq_categories bc ON bc.id = bl.category_id
                    WHERE bc.model_id = m.id AND bc.is_option = 0 AND bl.is_active = 1
                ), 0) AS calculated_base_price
            FROM models m
            WHERE m.is_active = 1
            ORDER BY m.display_order ASC, m.id ASC
        ");
        $stmt->execute();
        $models = $stmt->fetchAll();

        // Per-pro model overrides (price adjustment + enable/disable)
        $ovStmt = $db->prepare("
            SELECT model_id, price_adjustment, is_enabled
            FROM pro_model_overrides
            WHERE user_id = ?
        ");
        $ovStmt->execute([$userId]);
        $overrides = [];
        foreach ($ovStmt->fetchAll() as $ov) {
            $overrides[(int)$ov['model_id']] = $ov;
        }

        $result = [];
        foreach ($models as $model) {
            $mid = (int)$model['id'];

            // Skip models explicitly disabled for this pro
            if (isset($overrides[$mid]) && !(bool)$overrides[$mid]['is_enabled']) {
                continue;
            }

            // Calculate effective price: BOQ or manual → apply margin → apply adjustment
            $boqPrice  = (float)($model['calculated_base_price'] ?? 0);
            $basePrice = $boqPrice > 0 ? $boqPrice : (float)($model['base_price'] ?? 0);
            if ($margin > 0) {
                $basePrice *= (1 + $margin / 100);
            }
            if (isset($overrides[$mid])) {
                $basePrice = max(0, $basePrice + (float)$overrides[$mid]['price_adjustment']);
            }

            $model['id']                    = $mid;
            $model['base_price']            = round($basePrice, 2);
            $model['calculated_base_price'] = round($basePrice, 2);
            $model['price_source']          = 'pro_adjusted';
            $model['base_price_ht']         = round($basePrice, 2);
            $model['is_active']             = (bool)$model['is_active'];
            $model['has_overflow']          = (bool)($model['has_overflow'] ?? false);
            $model['surface_m2']            = (float)($model['surface_m2'] ?? 0);
            $model['bedrooms']              = (int)($model['bedrooms'] ?? 0);
            $model['bathrooms']             = (int)($model['bathrooms'] ?? 0);
            $model['container_20ft_count']  = (int)($model['container_20ft_count'] ?? 0);
            $model['container_40ft_count']  = (int)($model['container_40ft_count'] ?? 0);
            $model['display_order']         = (int)($model['display_order'] ?? 0);
            $result[] = $model;
        }

        // Make logo URL absolute if it's a relative Sunbox path
        $logoUrl    = (string)($profile['logo_url'] ?? '');
        $sunboxBase = rtrim((string)env('APP_URL', ''), '/');
        // APP_URL from Sunbox root .env is sunbox-mauritius.com; pro .env overrides it.
        // Use SUNBOX_DB_NAME as a proxy: reconstruct Sunbox base from the pro .env's APP_URL
        // which may be mrbcreativecontracting.com. Instead, derive from the Sunbox root .env
        // APP_URL loaded first before the override.
        // We stored SUNBOX_DB_NAME; derive sunbox base URL another way — use the .env path.
        $sunboxRootEnvPath = dirname(__DIR__, 3) . '/.env';
        $sunboxAppUrl = '';
        if (is_file($sunboxRootEnvPath)) {
            foreach (file($sunboxRootEnvPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $l) {
                if (str_starts_with(trim($l), 'APP_URL=')) {
                    $sunboxAppUrl = rtrim(trim(substr(trim($l), 8), '"\''), '/');
                    break;
                }
            }
        }
        if (!$sunboxAppUrl) $sunboxAppUrl = 'https://sunbox-mauritius.com';
        if ($logoUrl !== '' && str_starts_with($logoUrl, '/')) {
            $logoUrl = $sunboxAppUrl . $logoUrl;
        }

        return [
            'models'       => $result,
            'catalog_mode' => $credits <= 0,
            'credits'      => $credits,
            'logo_url'     => $logoUrl,
            'company_name' => (string)($profile['company_name'] ?? ''),
        ];
    } catch (\Throwable $e) {
        error_log('ProSite fetchModels error: ' . $e->getMessage());
        if (API_DEBUG) return array_merge(['error' => $e->getMessage()], ['models' => [], 'catalog_mode' => true, 'credits' => 0, 'logo_url' => '', 'company_name' => '']);
        return $empty;
    }
}

/** Get credit balance directly from Sunbox DB. */
function checkCredits(): array
{
    try {
        $profile = getProProfile();
        if (!$profile) return ['credits' => 0, 'catalog_mode' => true];
        $credits = (float)($profile['credits'] ?? 0);
        return ['credits' => $credits, 'catalog_mode' => $credits <= 0];
    } catch (\Throwable $e) {
        error_log('ProSite checkCredits error: ' . $e->getMessage());
        return ['credits' => 0, 'catalog_mode' => true];
    }
}

/** Deduct credits atomically in Sunbox DB. */
function deductCredits(float $amount, string $reason, ?int $quoteId = null): array
{
    $allowedReasons = ['quote_created', 'quote_validated', 'boq_requested', 'model_request', 'production_deduction'];
    if ($amount <= 0 || !in_array($reason, $allowedReasons, true)) {
        return ['success' => false, 'error' => 'Paramètres invalides'];
    }
    try {
        $db = getSunboxDB();
        $db->beginTransaction();
        $lockStmt = $db->prepare("SELECT credits FROM professional_profiles WHERE user_id = ? FOR UPDATE");
        $lockStmt->execute([SUNBOX_USER_ID]);
        $current = (float)$lockStmt->fetchColumn();
        if ($current < $amount) {
            $db->rollBack();
            return ['success' => false, 'error' => 'Crédits insuffisants'];
        }
        $newBalance = $current - $amount;
        $db->prepare("UPDATE professional_profiles SET credits = ?, updated_at = NOW() WHERE user_id = ?")
           ->execute([$newBalance, SUNBOX_USER_ID]);
        $db->prepare("INSERT INTO professional_credit_transactions (user_id, amount, reason, quote_id, balance_after) VALUES (?, ?, ?, ?, ?)")
           ->execute([SUNBOX_USER_ID, -$amount, $reason, $quoteId, $newBalance]);
        $db->commit();
        return ['success' => true, 'data' => ['credits' => $newBalance, 'catalog_mode' => $newBalance <= 0]];
    } catch (\Throwable $e) {
        try { $db->rollBack(); } catch (\Throwable $ignored) {}
        error_log('ProSite deductCredits error: ' . $e->getMessage());
        return ['success' => false, 'error' => API_DEBUG ? $e->getMessage() : 'Erreur serveur'];
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
