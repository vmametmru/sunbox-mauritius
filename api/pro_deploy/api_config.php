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
define('PRO_FILE_VERSION', '2.8.0');

/**
 * Parse a single .env file from disk, bypassing getenv() entirely.
 * Returns an associative array of key → value.
 * PHP 7.4 compatible (no str_contains / str_starts_with).
 */
function parseEnvFile(string $path): array
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
 * Read the Sunbox root .env directly from disk — bypasses getenv() entirely.
 * Tries the same candidate paths as Sunbox's loadEnvFile() so we find the .env
 * regardless of whether it lives at the web-root level or one level above.
 *
 * Layout:  sunbox-root/pros/<domain>/api/config.php
 *   dirname(__DIR__, 3) = sunbox-root
 *   dirname(__DIR__, 4) = parent of sunbox-root (home dir)
 */
function parseSunboxRootEnv(): array
{
    static $cache = null;
    if ($cache !== null) return $cache;

    // Mirror Sunbox loadEnvFile() candidate list:
    $sunboxRoot = dirname(__DIR__, 3);           // sunbox-root/
    $candidates = [
        $sunboxRoot . '/.env',                   // sunbox-root/.env  (most common)
        $sunboxRoot . '/api/.env',               // sunbox-root/api/.env
        dirname(__DIR__, 4) . '/.env',           // parent of sunbox-root (cPanel home)
    ];
    $cache = [];
    foreach ($candidates as $path) {
        $parsed = parseEnvFile($path);
        if (!empty($parsed)) {
            $cache = $parsed;
            break;
        }
    }
    return $cache;
}

/** Load the pro site's own .env (one level up from api/). */
function loadEnvFiles(): void
{
    $path = dirname(__DIR__) . '/.env';
    $parsed = parseEnvFile($path);
    foreach ($parsed as $key => $val) {
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
        // Report which candidates were tried
        $sunboxRoot = dirname(__DIR__, 3);
        $tried = implode(', ', [
            $sunboxRoot . '/.env',
            $sunboxRoot . '/api/.env',
            dirname(__DIR__, 4) . '/.env',
        ]);
        throw new \Exception(
            "Sunbox DB: DB_NAME='{$name}', DB_USER='{$user}'. .env cherché dans: {$tried}."
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
 *
 * Returns:
 *   { models: [...], catalog_mode: bool, credits: float,
 *     logo_url: string, company_name: string, _error?: string }
 *
 * Design:
 *  - The pro_model_overrides query is wrapped in its own try/catch.
 *    If the table doesn't exist yet, all models are shown unfiltered.
 *  - image_url and plan_url are made absolute (prefixed with Sunbox base URL)
 *    so the pro site browser can load them from sunbox-mauritius.com.
 *  - On outer failure the error text is always returned as `_error` so the
 *    React app can surface a diagnostic message.
 */
function fetchModels(): array
{
    $empty = ['models' => [], 'catalog_mode' => true, 'credits' => 0, 'logo_url' => '', 'company_name' => ''];
    try {
        $db      = getSunboxDB();
        $profile = getProProfile();

        // Derive Sunbox base URL from root .env (not the pro .env which has the pro domain)
        $sunboxEnv    = parseSunboxRootEnv();
        $sunboxAppUrl = isset($sunboxEnv['APP_URL']) ? rtrim($sunboxEnv['APP_URL'], '/') : 'https://sunbox-mauritius.com';

        if (!$profile) {
            // No profile: return all Sunbox models without pro adjustments
            // (allows the site to work as a catalogue even before pro profile is set up)
            $stmt = $db->query("SELECT * FROM models WHERE is_active = 1 ORDER BY display_order ASC, id ASC");
            $rawModels = $stmt ? $stmt->fetchAll() : [];
            $result = [];
            foreach ($rawModels as $model) {
                $model = makeModelUrlsAbsolute($model, $sunboxAppUrl);
                $result[] = $model;
            }
            $err = SUNBOX_USER_ID === 0
                ? 'SUNBOX_USER_ID=0: pro .env non chargé ou manquant'
                : 'Profil pro non trouvé pour user_id=' . SUNBOX_USER_ID;
            return array_merge($empty, ['models' => $result, 'catalog_mode' => true, '_error' => $err]);
        }

        $userId  = SUNBOX_USER_ID;
        $margin  = (float)($profile['sunbox_margin_percent'] ?? 0);
        $credits = (float)($profile['credits'] ?? 0);

        // Fetch active models with BOQ price (mirrors Sunbox get_models logic)
        $stmt = $db->prepare("
            SELECT m.* FROM models m
            WHERE m.is_active = 1
            ORDER BY m.display_order ASC, m.id ASC
        ");
        $stmt->execute();
        $models = $stmt->fetchAll();

        // Per-pro model overrides — non-fatal: missing table = no overrides
        $overrides = [];
        try {
            $ovStmt = $db->prepare(
                "SELECT model_id, price_adjustment, is_enabled FROM pro_model_overrides WHERE user_id = ?"
            );
            $ovStmt->execute([$userId]);
            foreach ($ovStmt->fetchAll() as $ov) {
                $overrides[(int)$ov['model_id']] = $ov;
            }
        } catch (\Throwable $ovErr) {
            // Table missing or query error — show all models without filtering
            error_log('ProSite: pro_model_overrides unavailable: ' . $ovErr->getMessage());
        }

        // Active discounts from Sunbox (non-fatal)
        $today = date('Y-m-d');
        $allDiscounts = [];
        try {
            $dStmt = $db->prepare("
                SELECT d.id, d.name, d.discount_type, d.discount_value, d.apply_to, d.end_date,
                       GROUP_CONCAT(dm.model_id) AS model_ids_csv
                FROM discounts d
                LEFT JOIN discount_models dm ON dm.discount_id = d.id
                WHERE d.is_active = 1 AND d.start_date <= ? AND d.end_date >= ?
                GROUP BY d.id
                ORDER BY d.discount_value DESC
            ");
            $dStmt->execute([$today, $today]);
            foreach ($dStmt->fetchAll() as $disc) {
                $disc['discount_value'] = (float)$disc['discount_value'];
                $disc['id']             = (int)$disc['id'];
                $disc['model_ids']      = $disc['model_ids_csv']
                    ? array_map('intval', explode(',', $disc['model_ids_csv']))
                    : [];
                unset($disc['model_ids_csv']);
                $allDiscounts[] = $disc;
            }
        } catch (\Throwable $ignored) {}

        $result = [];
        foreach ($models as $model) {
            $mid = (int)$model['id'];

            // Skip models explicitly disabled for this pro
            if (isset($overrides[$mid]) && !(int)$overrides[$mid]['is_enabled']) {
                continue;
            }

            // BOQ base price: use boq_categories/boq_lines if available
            $boqPrice = 0.0;
            try {
                $bStmt = $db->prepare("
                    SELECT COALESCE(SUM(
                        ROUND(bl.quantity * COALESCE(pl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)
                    ), 0) AS boq_price
                    FROM boq_categories bc
                    LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                    LEFT JOIN pool_boq_price_list pl ON bl.price_list_id = pl.id
                    WHERE bc.model_id = ? AND bc.is_option = FALSE
                ");
                $bStmt->execute([$mid]);
                $boqPrice = (float)($bStmt->fetchColumn() ?? 0);
            } catch (\Throwable $ignored) {}

            $unforeseen = (float)($model['unforeseen_cost_percent'] ?? 10);
            if ($boqPrice > 0) {
                $basePrice = $boqPrice * (1 + $unforeseen / 100);
                $model['price_source'] = 'boq';
            } else {
                $basePrice = (float)($model['base_price'] ?? 0);
                $model['price_source'] = 'manual';
            }

            // Apply pro margin
            if ($margin > 0) {
                $basePrice *= (1 + $margin / 100);
            }
            // Apply pro override price adjustment
            if (isset($overrides[$mid])) {
                $basePrice = max(0, $basePrice + (float)$overrides[$mid]['price_adjustment']);
            }

            $model['id']                    = $mid;
            $model['base_price']            = round($basePrice, 2);
            $model['calculated_base_price'] = round($basePrice, 2);
            $model['base_price_ht']         = round($basePrice, 2);
            $model['boq_base_price_ht']     = round($boqPrice, 2);
            $model['is_active']             = (bool)$model['is_active'];
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

            // Fetch photo and plan URLs from model_images table
            try {
                $planRow  = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type='plan'  ORDER BY is_primary DESC, id DESC LIMIT 1");
                $photoRow = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type='photo' ORDER BY is_primary DESC, id DESC LIMIT 1");
                $planRow->execute([$mid]);
                $photoRow->execute([$mid]);
                $plan  = $planRow->fetch();
                $photo = $photoRow->fetch();
                if ($plan  && $plan['file_path'])  $model['plan_url']  = '/' . ltrim($plan['file_path'],  '/');
                if ($photo && $photo['file_path']) $model['image_url'] = '/' . ltrim($photo['file_path'], '/');
                elseif (!empty($model['image_url'])) $model['image_url'] = '/' . ltrim($model['image_url'], '/');
            } catch (\Throwable $ignored) {}

            // Make image/plan URLs absolute so pro site browser fetches from Sunbox server
            $model = makeModelUrlsAbsolute($model, $sunboxAppUrl);

            // Embed active discounts for this model (global or model-specific)
            $modelDiscs = array_values(array_filter($allDiscounts, function ($d) use ($mid) {
                return empty($d['model_ids']) || in_array($mid, $d['model_ids'], true);
            }));
            $model['active_discounts'] = $modelDiscs;

            $result[] = $model;
        }

        // Make logo URL absolute
        $logoUrl = (string)($profile['logo_url'] ?? '');
        if ($logoUrl !== '' && $logoUrl[0] === '/') {
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
        return array_merge($empty, ['_error' => $e->getMessage()]);
    }
}

/**
 * Return the Sunbox base URL from the root .env (e.g. https://sunbox-mauritius.com).
 * Used to make all Sunbox-hosted image/plan URLs absolute.
 */
function sunboxBaseUrl(): string
{
    static $base = null;
    if ($base !== null) return $base;
    $e    = parseSunboxRootEnv();
    $base = isset($e['APP_URL']) ? rtrim($e['APP_URL'], '/') : 'https://sunbox-mauritius.com';
    return $base;
}

/**
 * Make a single root-relative path absolute using the Sunbox base URL.
 */
function sunboxAbsUrl(?string $path): ?string
{
    if ($path === null || $path === '') return $path;
    if (strpos($path, '://') !== false) return $path;  // already absolute
    if (strlen($path) > 0 && $path[0] === '/') return sunboxBaseUrl() . $path;
    return $path;
}

/**
 * Prefix relative image_url / plan_url with the Sunbox base URL.
 * The pro site browser requests images from the pro domain by default —
 * they must point to sunbox-mauritius.com where the uploads live.
 */
function makeModelUrlsAbsolute(array $model, string $sunboxBase): array
{
    foreach (['image_url', 'plan_url'] as $key) {
        if (!isset($model[$key]) || $model[$key] === '' || $model[$key] === null) continue;
        $url = (string)$model[$key];
        // Already absolute (http/https) — leave as-is
        if (strpos($url, '://') !== false) continue;
        // Root-relative path: prepend Sunbox base
        if (strlen($url) > 0 && $url[0] === '/') {
            $model[$key] = rtrim($sunboxBase, '/') . $url;
        }
    }
    return $model;
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
    if (empty($_SESSION['is_pro_user'])) { errorResponse('Unauthorized', 401); }
}

function jsonResponse($data, $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit(); }
function errorResponse($msg, $code = 400): void { jsonResponse(['error' => $msg, 'success' => false], $code); }
function successResponse($data = null): void { $r = ['success' => true]; if ($data !== null) $r['data'] = $data; jsonResponse($r); }
function getRequestBody(): array { return json_decode(file_get_contents('php://input'), true) ?? []; }
function validateRequired($data, $fields): void {
    $missing = array_filter($fields, fn($f) => !isset($data[$f]) || $data[$f] === '');
    if (!empty($missing)) errorResponse("Missing: " . implode(', ', $missing));
}

function sanitize($value) {
    if (is_string($value)) return strip_tags(trim($value));
    return $value;
}

function generateReference(): string
{
    // uniqid() needs a string prefix (PHP 8 strict); use empty string for entropy from microsecond clock
    return 'PRO-' . date('Ymd') . '-' . strtoupper(substr(md5(uniqid('', true)), 0, 6));
}
