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

// ── Collect files to include in ZIP ──────────────────────────────────────────

/** @var array<string,string> $files  zipPath => fileContent */
$files = [];

// Template files: [source file in pro_deploy/] => [path inside ZIP]
$templateFiles = [
    'README.md'           => 'README.md',
    'dot_env_example'     => '.env.example',
    'api_config.php'      => 'api/config.php',
    'api_index.php'       => 'api/index.php',
    'api_htaccess'        => 'api/.htaccess',
    'htaccess'            => '.htaccess',
    'pro_site_schema.sql' => 'database/pro_site_schema.sql',
];

foreach ($templateFiles as $src => $dest) {
    $srcPath = $templateDir . '/' . $src;
    if (!is_file($srcPath)) continue;
    $content = file_get_contents($srcPath);
    if ($content === false) continue;
    $files[$dest] = replacePlaceholders($content, $placeholders);
}

// Vite environment template
$files['.env.production'] = "# Vite environment for pro site build\n"
    . "# Set these before running: npm run build\n\n"
    . "VITE_PRO_MODE=true\n"
    . "VITE_API_URL=/api\n"
    . "VITE_SUNBOX_API_URL=https://sunbox-mauritius.com/api\n"
    . "VITE_SUNBOX_API_TOKEN={$token}\n"
    . "VITE_COMPANY_NAME={$companyName}\n"
    . "VITE_DOMAIN={$domain}\n";

// Build instructions
$files['BUILD_INSTRUCTIONS.md'] = "# Frontend Build Instructions\n\n"
    . "## Prerequisites\n- Node.js 18+\n- npm 9+\n\n"
    . "## Steps\n\n"
    . "1. Clone or download the Sunbox frontend source:\n"
    . "   git clone https://github.com/vmametmru/sunbox-mauritius.git\n\n"
    . "2. Copy the .env.production file from this package to the project root\n\n"
    . "3. Install dependencies:\n   npm install\n\n"
    . "4. Build for production:\n   npm run build\n\n"
    . "5. Upload the contents of the `dist/` folder to your web server root (public_html/)\n\n"
    . "## Notes\n"
    . "- VITE_PRO_MODE=true hides BOQ, model creation, and admin-only features\n"
    . "- The site automatically enters catalog mode when credits run out\n"
    . "- Models and prices are fetched from Sunbox main API using your token\n";

// ── Build ZIP bytes in-memory (pure PHP, no extensions needed) ───────────────

/**
 * Build a ZIP archive as a string.
 * Implements ZIP 2.0 (stored / no compression) – perfectly adequate for text files.
 *
 * @param array<string,string> $entries  zipPath => fileContent
 * @return string  Raw ZIP bytes
 */
function buildZip(array $entries): string
{
    $localHeaders  = '';
    $centralDir    = '';
    $offset        = 0;
    $dosDate       = dosDateTime();

    foreach ($entries as $name => $data) {
        $crc    = crc32($data);
        $size   = strlen($data);
        $nameB  = $name;
        $nameLen = strlen($nameB);

        // Local file header
        $local  = "\x50\x4b\x03\x04";   // signature
        $local .= pack('v', 20);          // version needed: 2.0
        $local .= pack('v', 0);           // general purpose bit flag
        $local .= pack('v', 0);           // compression: stored
        $local .= pack('V', $dosDate);    // last mod time+date (packed together)
        $local .= pack('V', $crc);        // CRC-32
        $local .= pack('V', $size);       // compressed size
        $local .= pack('V', $size);       // uncompressed size
        $local .= pack('v', $nameLen);    // file name length
        $local .= pack('v', 0);           // extra field length
        $local .= $nameB;                 // file name
        $local .= $data;                  // file data

        $localHeaders .= $local;

        // Central directory entry
        $central  = "\x50\x4b\x01\x02";  // signature
        $central .= pack('v', 20);         // version made by
        $central .= pack('v', 20);         // version needed
        $central .= pack('v', 0);          // general purpose bit flag
        $central .= pack('v', 0);          // compression
        $central .= pack('V', $dosDate);   // last mod time+date
        $central .= pack('V', $crc);       // CRC-32
        $central .= pack('V', $size);      // compressed size
        $central .= pack('V', $size);      // uncompressed size
        $central .= pack('v', $nameLen);   // file name length
        $central .= pack('v', 0);          // extra field length
        $central .= pack('v', 0);          // file comment length
        $central .= pack('v', 0);          // disk number start
        $central .= pack('v', 0);          // internal file attributes
        $central .= pack('V', 0);          // external file attributes
        $central .= pack('V', $offset);    // relative offset of local header
        $central .= $nameB;                // file name

        $centralDir .= $central;

        // Local header (30) + name + data
        $offset += 30 + $nameLen + $size;
    }

    $cdSize   = strlen($centralDir);
    $cdOffset = $offset;
    $numFiles = count($entries);

    // End of central directory record
    $eocd  = "\x50\x4b\x05\x06";   // signature
    $eocd .= pack('v', 0);           // disk number
    $eocd .= pack('v', 0);           // disk with start of central directory
    $eocd .= pack('v', $numFiles);   // entries on this disk
    $eocd .= pack('v', $numFiles);   // total entries
    $eocd .= pack('V', $cdSize);     // size of central directory
    $eocd .= pack('V', $cdOffset);   // offset of central directory
    $eocd .= pack('v', 0);           // comment length

    return $localHeaders . $centralDir . $eocd;
}

/**
 * Returns current date/time packed as a DOS date-time DWORD (4 bytes little-endian).
 * DOS time: bits 0-4 = seconds/2, 5-10 = minutes, 11-15 = hours
 * DOS date: bits 0-4 = day, 5-8 = month, 9-15 = year-1980
 */
function dosDateTime(): int
{
    $t = getdate();
    $time = ($t['hours'] << 11) | ($t['minutes'] << 5) | (int)($t['seconds'] / 2);
    $date = (($t['year'] - 1980) << 9) | ($t['mon'] << 5) | $t['mday'];
    // Pack as a single 32-bit DWORD: low word = time, high word = date
    return ($date << 16) | $time;
}

$zipBytes = buildZip($files);

// ── Stream ZIP to browser ─────────────────────────────────────────────────────
$filename = 'sunbox-pro-' . preg_replace('/[^a-z0-9-]/', '-', strtolower($domain)) . '.zip';

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($zipBytes));
header('Cache-Control: no-cache, no-store');
header('Pragma: no-cache');

echo $zipBytes;
exit();
