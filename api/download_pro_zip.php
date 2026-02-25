<?php
/**
 * download_pro_zip.php
 * Streams a deployment ZIP for a professional user.
 * Requires admin session authentication.
 *
 * Usage: GET /api/download_pro_zip.php?user_id=123
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

handleCORS();
startSession();

// ── Admin auth ────────────────────────────────────────────────────────────────
if (empty($_SESSION['is_admin'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Non autorisé'], JSON_UNESCAPED_UNICODE);
    exit();
}

$userId = (int)($_GET['user_id'] ?? 0);
if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id manquant'], JSON_UNESCAPED_UNICODE);
    exit();
}

// ── Load pro user data ────────────────────────────────────────────────────────
try {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email,
               pp.company_name, pp.domain, pp.api_token, pp.address,
               pp.vat_number, pp.brn_number, pp.phone
        FROM users u
        JOIN professional_profiles pp ON pp.user_id = u.id
        WHERE u.id = ? AND u.role = 'professional'
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données'], JSON_UNESCAPED_UNICODE);
    exit();
}

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Utilisateur professionnel introuvable'], JSON_UNESCAPED_UNICODE);
    exit();
}

// ── Ensure api_token exists (generate if missing) ─────────────────────────────
if (empty($user['api_token'])) {
    $token = bin2hex(random_bytes(32));
    $db->prepare("UPDATE professional_profiles SET api_token = ? WHERE user_id = ?")->execute([$token, $userId]);
    $user['api_token'] = $token;
}

$domain      = $user['domain'] ?: 'your-domain.mu';
$token       = $user['api_token'];
$companyName = $user['company_name'] ?: $user['name'];

$templateDir = __DIR__ . '/pro_deploy';

// ── Build the ZIP in memory ───────────────────────────────────────────────────
if (!class_exists('ZipArchive')) {
    http_response_code(500);
    echo json_encode(['error' => 'ZipArchive extension manquante sur le serveur'], JSON_UNESCAPED_UNICODE);
    exit();
}

$zipPath = sys_get_temp_dir() . '/sunbox_pro_' . $userId . '_' . time() . '.zip';
$zip = new ZipArchive();
if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    http_response_code(500);
    echo json_encode(['error' => 'Impossible de créer le ZIP'], JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Replace template placeholders with actual values.
 */
function replacePlaceholders(string $content, array $vars): string
{
    foreach ($vars as $k => $v) {
        $content = str_replace('{{' . $k . '}}', $v, $content);
    }
    return $content;
}

$placeholders = [
    'API_TOKEN'    => $token,
    'DOMAIN'       => $domain,
    'COMPANY_NAME' => $companyName,
];

// ── Add template files to ZIP ─────────────────────────────────────────────────

// Map: [source file in pro_deploy/] => [path inside ZIP]
$templateFiles = [
    'README.md'          => 'README.md',
    'dot_env_example'    => '.env.example',
    'api_config.php'     => 'api/config.php',
    'api_index.php'      => 'api/index.php',
    'api_htaccess'       => 'api/.htaccess',
    'htaccess'           => '.htaccess',
    'pro_site_schema.sql'=> 'database/pro_site_schema.sql',
];

foreach ($templateFiles as $src => $dest) {
    $srcPath = $templateDir . '/' . $src;
    if (!is_file($srcPath)) continue;

    $content = file_get_contents($srcPath);
    if ($content === false) continue;

    $content = replacePlaceholders($content, $placeholders);
    $zip->addFromString($dest, $content);
}

// ── Add a vite environment template ──────────────────────────────────────────
$viteEnv = <<<ENV
# Vite environment for pro site build
# Set these before running: npm run build

VITE_PRO_MODE=true
VITE_API_URL=/api
VITE_SUNBOX_API_URL=https://sunbox-mauritius.com/api
VITE_SUNBOX_API_TOKEN={$token}
VITE_COMPANY_NAME={$companyName}
VITE_DOMAIN={$domain}
ENV;
$zip->addFromString('.env.production', $viteEnv);

// ── Add a build instructions file ────────────────────────────────────────────
$buildInstructions = <<<INST
# Frontend Build Instructions

## Prerequisites
- Node.js 18+
- npm 9+

## Steps

1. Clone or download the Sunbox frontend source:
   git clone https://github.com/vmametmru/sunbox-mauritius.git

2. Copy the .env.production file from this package to the project root

3. Install dependencies:
   npm install

4. Build for production:
   npm run build

5. Upload the contents of the `dist/` folder to your web server root (public_html/)

## Notes
- VITE_PRO_MODE=true hides BOQ, model creation, and admin-only features
- The site automatically enters catalog mode when credits run out
- Models and prices are fetched from Sunbox main API using your token
INST;
$zip->addFromString('BUILD_INSTRUCTIONS.md', $buildInstructions);

$zip->close();

// ── Stream ZIP to browser ─────────────────────────────────────────────────────
$filename = 'sunbox-pro-' . preg_replace('/[^a-z0-9-]/', '-', strtolower($domain)) . '.zip';

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($zipPath));
header('Cache-Control: no-cache, no-store');
header('Pragma: no-cache');

readfile($zipPath);
@unlink($zipPath);
exit();
