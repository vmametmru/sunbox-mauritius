<?php
/**
 * Semi-Pro site dynamic index.php
 *
 * Reads the CURRENT Sunbox index.html and injects:
 *   window.__SEMI_PRO_SITE__ = true
 *
 * This flag tells the React app to:
 *   1. Redirect public routes (home, about, models...) to /pro-login
 *   2. Show email + password fields on the login page (multi-user)
 *   3. Call /api/pro_auth.php with {email, password}
 *
 * No theme or company-specific branding is injected here since all
 * semi-pro users share the same subdirectory.
 */

header('Content-Type: text/html; charset=utf-8');

$siteDir    = __DIR__;
$sunboxRoot = dirname($siteDir, 2); // pros/<slug>/ -> pros/ -> Sunbox root

// ── Minimal .env parser ───────────────────────────────────────────────────────
function semiProIndexParseEnv(string $path): array {
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

// ── Load config from .env ─────────────────────────────────────────────────────
$localEnv    = semiProIndexParseEnv($siteDir . '/.env');
$sunboxEnv   = [];
foreach ([
    $sunboxRoot . '/.env',
    $sunboxRoot . '/api/.env',
    dirname($sunboxRoot) . '/.env',
] as $_candidate) {
    $parsed = semiProIndexParseEnv($_candidate);
    if (!empty($parsed)) { $sunboxEnv = $parsed; break; }
}

$siteAppUrl  = rtrim($localEnv['APP_URL'] ?? '', '/');
$companyName = $localEnv['COMPANY_NAME'] ?? 'Semi-Pro ERP';
$sunboxBase  = rtrim($sunboxEnv['APP_URL'] ?? 'https://sunbox-mauritius.com', '/');

// ── Read Sunbox index.html ────────────────────────────────────────────────────
$indexHtml = null;
foreach ([
    $sunboxRoot . '/index.html',
] as $path) {
    if (is_file($path) && ($content = file_get_contents($path)) !== false) {
        $indexHtml = $content;
        break;
    }
}

if ($indexHtml === null && is_file($siteDir . '/index.html')) {
    $indexHtml = file_get_contents($siteDir . '/index.html');
}

if ($indexHtml === null) {
    echo '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">'
       . '<title>Semi-Pro ERP — Déploiement en cours</title>'
       . '<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4;}'
       . '.box{text-align:center;padding:2rem;border-radius:1rem;background:white;box-shadow:0 4px 24px rgba(0,0,0,.08);}'
       . 'h1{color:#16a34a;}p{color:#6b7280;}</style></head><body>'
       . '<div class="box"><h1>Site en cours de déploiement</h1>'
       . '<p>Veuillez réessayer dans quelques instants.</p></div></body></html>';
    exit;
}

// ── Rewrite asset paths ───────────────────────────────────────────────────────
$assetsLink = $siteDir . '/assets';
if (!file_exists($assetsLink) && !is_link($assetsLink)) {
    $indexHtml = str_replace(' href="/assets/', ' href="' . $sunboxBase . '/assets/', $indexHtml);
    $indexHtml = str_replace(' src="/assets/',  ' src="'  . $sunboxBase . '/assets/', $indexHtml);
}

foreach (['/vite.svg', '/favicon.ico', '/favicon.png'] as $staticAsset) {
    $indexHtml = str_replace(
        ' href="' . $staticAsset . '"',
        ' href="' . $sunboxBase . $staticAsset . '"',
        $indexHtml
    );
}

// ── Inject semi-pro config variables before </head> ───────────────────────────
$apiBaseUrl  = $siteAppUrl . '/api';
$inject = '<script>'
    . 'window.__SEMI_PRO_SITE__=true;'
    . 'window.__PRO_SITE__=false;'
    . 'window.__API_BASE_URL__='      . json_encode($apiBaseUrl,   JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
    . 'window.__PRO_COMPANY_NAME__='  . json_encode($companyName,  JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';'
    . 'window.__PRO_LOGO_URL__=\'\';'
    . 'window.__PRO_THEME__=null;'
    . 'window.__PRO_HEADER_IMAGES__=[];'
    . '</script>';

$closeHeadPos = stripos($indexHtml, '</head>');
if ($closeHeadPos !== false) {
    $indexHtml = substr($indexHtml, 0, $closeHeadPos) . $inject . "\n" . substr($indexHtml, $closeHeadPos);
} else {
    $indexHtml .= $inject;
}

echo $indexHtml;
