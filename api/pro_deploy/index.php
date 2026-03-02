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
$sunboxEnv   = proIndexParseEnv($sunboxRoot . '/.env');

$proAppUrl   = rtrim($proEnv['APP_URL']      ?? '', '/');
$logoUrl     = $proEnv['LOGO_URL']           ?? '';
$companyName = $proEnv['COMPANY_NAME']       ?? '';
$sunboxBase  = rtrim($sunboxEnv['APP_URL']   ?? 'https://sunbox-mauritius.com', '/');

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
$apiBaseUrl  = $proAppUrl . '/api';
$inject = '<script>'
    . 'window.__PRO_SITE__=true;'
    . 'window.__API_BASE_URL__='     . json_encode($apiBaseUrl,   JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
    . 'window.__PRO_LOGO_URL__='     . json_encode($logoUrl,      JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
    . 'window.__PRO_COMPANY_NAME__=' . json_encode($companyName,  JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
    . '</script>';

$closeHeadPos = stripos($indexHtml, '</head>');
if ($closeHeadPos !== false) {
    $indexHtml = substr($indexHtml, 0, $closeHeadPos) . $inject . "\n" . substr($indexHtml, $closeHeadPos);
} else {
    $indexHtml .= $inject;
}

echo $indexHtml;
