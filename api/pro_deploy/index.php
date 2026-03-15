<?php
/**
 * Pro site dynamic index.php
 *
 * Reads the CURRENT Sunbox index.html on every request and serves it with
 * pro-specific injections. This eliminates the stale-hash problem: every time
 * Sunbox is rebuilt, Vite generates new content-hashed filenames. A static copy
 * of index.html becomes stale immediately. This PHP file always reads the live
 * version, so the pro site is always in sync with the latest Sunbox build.
 *
 * Configuration is read from this directory's .env file (written by deploy_pro_site).
 */

header('Content-Type: text/html; charset=utf-8');

$proDir     = __DIR__;
$sunboxRoot = dirname($proDir, 2); // pros/<domain>/ -> pros/ -> Sunbox root

// ── Minimal .env parser ───────────────────────────────────────────────────────
function proIndexParseEnv(string $path): array {
    if (!is_file($path)) return [];
    $vars = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$k, $v] = explode('=', $line, 2);
        $vars[trim($k)] = trim($v, " \t\n\r\0\x0B\"'");
    }
    return $vars;
}

// ── Load pro config from .env ─────────────────────────────────────────────────
$proEnv      = proIndexParseEnv($proDir . '/.env');
// Try several parent candidates for the Sunbox root .env
$sunboxEnv = [];
foreach ([
    $sunboxRoot . '/.env',
    $sunboxRoot . '/api/.env',
    dirname($sunboxRoot) . '/.env',
] as $_candidate) {
    $parsed = proIndexParseEnv($_candidate);
    if (!empty($parsed)) { $sunboxEnv = $parsed; break; }
}

$proAppUrl   = rtrim($proEnv['APP_URL']      ?? '', '/');
$logoUrl     = $proEnv['LOGO_URL']           ?? '';
$companyName = $proEnv['COMPANY_NAME']       ?? '';
$sunboxBase  = rtrim($sunboxEnv['APP_URL']   ?? 'https://sunbox-mauritius.com', '/');

// ── Fetch theme, header images, logo and login background from Sunbox DB ─────
// This makes branding changes take effect immediately without redeploying.
$proUserId     = (int)($proEnv['SUNBOX_USER_ID'] ?? 0);
$themeJson     = 'null';
$headerImgJson = '[]';
$loginBgUrl    = '';  // will be overridden from DB when available

if ($proUserId > 0) {
    try {
        $_dbHost = $sunboxEnv['DB_HOST'] ?? 'localhost';
        $_dbName = $sunboxEnv['DB_NAME'] ?? '';
        $_dbUser = $sunboxEnv['DB_USER'] ?? '';
        $_dbPass = $sunboxEnv['DB_PASS'] ?? '';
        if ($_dbName && $_dbUser) {
            $_pdo = new PDO(
                "mysql:host={$_dbHost};dbname={$_dbName};charset=utf8mb4",
                $_dbUser, $_dbPass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                 PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                 PDO::ATTR_EMULATE_PREPARES   => false]
            );

            // Fetch logo_url and login_bg_url from DB (authoritative, no redeploy needed).
            // Wrapped in its own try/catch so a missing column (schema not yet migrated)
            // doesn't prevent theme and header-image loading below.
            try {
                $_stmtBrand = $_pdo->prepare(
                    "SELECT logo_url, login_bg_url FROM professional_profiles WHERE user_id = ? LIMIT 1"
                );
                $_stmtBrand->execute([$proUserId]);
                $_brand = $_stmtBrand->fetch();
                if ($_brand) {
                    if (!empty($_brand['logo_url'])) {
                        $_dbLogoUrl = (string)$_brand['logo_url'];
                        // Make absolute if relative path
                        if (strpos($_dbLogoUrl, 'http') !== 0 && strlen($_dbLogoUrl) > 0) {
                            $_dbLogoUrl = rtrim($sunboxBase, '/') . '/' . ltrim($_dbLogoUrl, '/');
                        }
                        $logoUrl = $_dbLogoUrl;
                    }
                    if (!empty($_brand['login_bg_url'])) {
                        $_dbLoginBg = (string)$_brand['login_bg_url'];
                        if (strpos($_dbLoginBg, 'http') !== 0 && strlen($_dbLoginBg) > 0) {
                            $_dbLoginBg = rtrim($sunboxBase, '/') . '/' . ltrim($_dbLoginBg, '/');
                        }
                        $loginBgUrl = $_dbLoginBg;
                    }
                }
            } catch (\Throwable $_brandEx) {
                // Could be a missing column (schema migration pending) or a connection issue.
                // Fall back to .env values for logo/background.
                if (($proEnv['API_DEBUG'] ?? '') === 'true') {
                    error_log('[index.php] Brand fetch failed (will use .env fallback): ' . $_brandEx->getMessage());
                }
            }

            // Fetch assigned theme
            $_stmt = $_pdo->prepare("
                SELECT pt.logo_position, pt.header_height, pt.header_bg_color,
                       pt.header_text_color, pt.font_family, pt.nav_position,
                       pt.nav_has_background, pt.nav_bg_color, pt.nav_text_color,
                       pt.nav_hover_color, pt.button_color, pt.button_text_color,
                       pt.footer_bg_color, pt.footer_text_color
                FROM professional_profiles pp
                JOIN professional_themes pt ON pt.id = pp.theme_id
                WHERE pp.user_id = ?
                LIMIT 1
            ");
            $_stmt->execute([$proUserId]);
            $_theme = $_stmt->fetch();
            if ($_theme) {
                $_theme['nav_has_background'] = (bool)$_theme['nav_has_background'];
                $themeJson = json_encode($_theme, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
            }

            // Fetch header images
            $_stmt2 = $_pdo->prepare(
                "SELECT header_images_json FROM professional_profiles WHERE user_id = ? LIMIT 1"
            );
            $_stmt2->execute([$proUserId]);
            $_row2 = $_stmt2->fetch();
            if ($_row2 && !empty($_row2['header_images_json'])) {
                $_imgs = json_decode($_row2['header_images_json'], true);
                if (is_array($_imgs) && count($_imgs) > 0) {
                    // Convert relative URLs to absolute Sunbox URLs.
                    // Images uploaded via the Sunbox portal are stored as relative paths
                    // (e.g. /uploads/sketches/...). When served on the pro domain those
                    // paths would resolve to the wrong host, so we prepend the Sunbox base.
                    $_imgs = array_map(function ($url) use ($sunboxBase) {
                        if ($url !== '' && strpos($url, 'http') !== 0) {
                            return rtrim($sunboxBase, '/') . '/' . ltrim($url, '/');
                        }
                        return $url;
                    }, $_imgs);
                    $headerImgJson = json_encode(
                        array_values(array_filter($_imgs)),
                        JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE
                    );
                }
            }
        }
    } catch (\Throwable $_e) {
        // Fail silently — site still renders without theme customisation
        if (($proEnv['API_DEBUG'] ?? '') === 'true') {
            error_log('[index.php] Theme/images load failed: ' . $_e->getMessage());
        }
    }
}

// Fallback: read from .env if DB didn't provide a value
if ($loginBgUrl === '') {
    $loginBgUrl = $proEnv['LOGIN_BG_URL'] ?? '';
}

// ── Read Sunbox index.html ────────────────────────────────────────────────────
$indexHtml = null;
$candidates = [
    $sunboxRoot . '/index.html',   // Sunbox built index.html (standard)
];
foreach ($candidates as $path) {
    if (is_file($path) && ($content = file_get_contents($path)) !== false) {
        $indexHtml = $content;
        break;
    }
}

// Fallback: static copy deployed alongside this file
if ($indexHtml === null && is_file($proDir . '/index.html')) {
    $indexHtml = file_get_contents($proDir . '/index.html');
}

if ($indexHtml === null) {
    echo '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">'
       . '<title>Site en déploiement</title>'
       . '<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fff7ed;}'
       . '.box{text-align:center;padding:2rem;border-radius:1rem;background:white;box-shadow:0 4px 24px rgba(0,0,0,.08);}'
       . 'h1{color:#ea580c;}p{color:#6b7280;}</style></head><body>'
       . '<div class="box"><h1>Site en cours de déploiement</h1>'
       . '<p>Veuillez réessayer dans quelques instants.</p></div></body></html>';
    exit;
}

// ── Rewrite /assets/ → absolute Sunbox URL ────────────────────────────────────
// The assets/ directory is a symlink to Sunbox root/assets/. When Apache serves
// the files via the symlink, the browser requests them from the pro domain — no
// CORS issues. So we keep root-relative /assets/ paths as-is. We only need to
// make the path absolute if the symlink doesn't exist.
$assetsLink = $proDir . '/assets';
if (!file_exists($assetsLink) && !is_link($assetsLink)) {
    // No symlink — rewrite to absolute Sunbox URL
    $indexHtml = str_replace(' href="/assets/', ' href="' . $sunboxBase . '/assets/', $indexHtml);
    $indexHtml = str_replace(' src="/assets/',  ' src="'  . $sunboxBase . '/assets/', $indexHtml);
}

// Always make vite.svg / favicon absolute (doesn't go through React router)
foreach (['/vite.svg', '/favicon.ico', '/favicon.png'] as $staticAsset) {
    $indexHtml = str_replace(
        ' href="' . $staticAsset . '"',
        ' href="' . $sunboxBase . $staticAsset . '"',
        $indexHtml
    );
}

// ── Inject pro config variables before </head> ────────────────────────────────
// When a custom domain is configured the site is accessed via that domain but
// APP_URL still points to the Sunbox subdirectory (e.g. sunbox-mauritius.com/pros/mokosting).
// Injecting APP_URL as the API base would make every fetch() call cross-origin,
// triggering CORS errors ("Failed to fetch").  Instead, derive the API URL from
// the actual HTTP_HOST so it is always same-origin with the browser.
$_customDomain = trim($proEnv['DOMAIN'] ?? '');
if ($_customDomain && !empty($_SERVER['HTTP_HOST'])) {
    $_proto     = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $apiBaseUrl = $_proto . '://' . $_SERVER['HTTP_HOST'] . '/api';
} else {
    $apiBaseUrl = $proAppUrl . '/api';
}
$inject = '<script>'
    . 'window.__PRO_SITE__=true;'
    . 'window.__API_BASE_URL__='     . json_encode($apiBaseUrl,   JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
    . 'window.__PRO_LOGO_URL__='     . json_encode($logoUrl,      JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
    . 'window.__PRO_LOGIN_BG__='     . json_encode($loginBgUrl,   JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
    . 'window.__PRO_COMPANY_NAME__=' . json_encode($companyName,  JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
    . 'window.__PRO_THEME__='        . $themeJson        . ';'
    . 'window.__PRO_HEADER_IMAGES__=' . $headerImgJson   . ';'
    . '</script>';

$closeHeadPos = stripos($indexHtml, '</head>');
if ($closeHeadPos !== false) {
    $indexHtml = substr($indexHtml, 0, $closeHeadPos) . $inject . "\n" . substr($indexHtml, $closeHeadPos);
} else {
    $indexHtml .= $inject;
}

echo $indexHtml;
