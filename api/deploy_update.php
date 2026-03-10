<?php
/**
 * deploy_update.php – Self-update endpoint for Sunbox.
 *
 * Accepts multipart/form-data with:
 *   - dist_zip : Vite build artifact (GitHub Actions artifact)
 *   - api_zip  : PHP API artifact
 *
 * Validation before any extraction:
 *   - dist_zip must contain "index.html" at root (Vite dist marker)
 *   - api_zip  must contain "index.php"  at root (Sunbox API marker)
 *
 * Extraction targets (__DIR__ = .../sunbox-mauritius.com/api):
 *   - dist_zip → dirname(__DIR__)       (web root)  — skips api/ sub-folder
 *   - api_zip  → dirname(__DIR__)/api/  (api root)
 *
 * A deployment log line is appended to web_root/.sunbox_version.
 */

require_once __DIR__ . '/config.php';
handleCORS(); // sets CORS headers and handles OPTIONS preflight

try {

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST requis']); exit;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function deployFail(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

/** Returns true if the PHP zip extension (ZipArchive) is available. */
function hasZipArchive(): bool {
    return class_exists('ZipArchive');
}

/** Returns true if exec() is available and not disabled. */
function hasExec(): bool {
    if (!function_exists('exec')) return false;
    $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
    return !in_array('exec', $disabled, true);
}

/**
 * Return all entry names in a zip, or throw RuntimeException.
 * Uses ZipArchive if available, falls back to exec('unzip -l').
 */
function zipEntryNames(string $path): array {
    if (hasZipArchive()) {
        $zip = new \ZipArchive();
        $rc  = $zip->open($path, \ZipArchive::RDONLY);
        if ($rc !== true) throw new \RuntimeException("Impossible d'ouvrir le ZIP (code $rc).");
        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) $names[] = $zip->getNameIndex($i);
        $zip->close();
        return $names;
    }
    if (hasExec()) {
        if (!is_file($path)) throw new \RuntimeException("Fichier ZIP introuvable: {$path}");
        $escaped = escapeshellarg($path);
        exec("unzip -l {$escaped} 2>&1", $output, $rc);
        if ($rc !== 0) throw new \RuntimeException("Impossible de lister le ZIP via unzip (code $rc).");
        $names = [];
        foreach ($output as $line) {
            // Lines look like: "  12345  2024-01-01 00:00:00  path/to/file"
            if (preg_match('/^\s*\d+\s+[\d-]+\s+[\d:]+\s+(.+)$/', $line, $m)) {
                $names[] = $m[1];
            }
        }
        return $names;
    }
    throw new \RuntimeException(
        "Impossible de lire le ZIP : l'extension PHP zip et la commande exec() sont toutes deux indisponibles. " .
        "Veuillez activer l'extension zip dans cPanel (Sélectionner la version PHP → Extensions → zip)."
    );
}

/**
 * Detect if ALL entries inside the zip are under a single top-level folder.
 * Returns that folder prefix (e.g., "dist/") or '' if files are at root level
 * or if the zip contains multiple top-level directories (mixed structure).
 * This handles GitHub Actions artifacts that may wrap files in a folder with any name.
 */
function detectSingleTopLevelDir(array $names): string {
    $roots = array_unique(array_filter(
        array_map(fn($n) => explode('/', $n)[0], $names)
    ));
    if (count($roots) === 1) {
        $root = reset($roots);
        if ($root !== '') return $root . '/';
    }
    return '';
}

/**
 * Extract zip to $destDir.
 * $prefix : strip this prefix from all entry names before writing.
 * $skip   : callable(string $relativeEntryName): bool — return true to skip.
 * Uses ZipArchive if available, falls back to exec('unzip').
 */
function extractZipTo(string $zipPath, string $destDir, string $prefix = '', ?callable $skip = null): int {
    if (hasZipArchive()) {
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) !== true) throw new \RuntimeException("Impossible d'ouvrir le ZIP pour extraction.");
        $count = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            // Strip prefix
            if ($prefix !== '' && strpos($name, $prefix) === 0) {
                $rel = substr($name, strlen($prefix));
            } else if ($prefix !== '') {
                continue; // entry outside expected prefix — skip
            } else {
                $rel = $name;
            }
            // Sanitise to prevent path traversal
            $rel = ltrim(str_replace('..', '', $rel), '/\\');
            if ($rel === '') continue;
            if ($skip && $skip($rel)) continue;

            $dest = $destDir . '/' . $rel;
            if (substr($rel, -1) === '/') {
                if (!is_dir($dest)) mkdir($dest, 0755, true);
                continue;
            }
            $parent = dirname($dest);
            if (!is_dir($parent)) mkdir($parent, 0755, true);
            $data = $zip->getFromIndex($i);
            if ($data !== false) { file_put_contents($dest, $data); $count++; }
        }
        $zip->close();
        return $count;
    }

    if (hasExec()) {
        if (!is_file($zipPath)) throw new \RuntimeException("Fichier ZIP introuvable: {$zipPath}");
        // exec fallback: extract to a temp dir then move files (to support prefix stripping and skip)
        $tmpDir = sys_get_temp_dir() . '/sunbox_deploy_' . bin2hex(random_bytes(8));
        mkdir($tmpDir, 0755, true);
        $escaped = escapeshellarg($zipPath);
        $escapedDest = escapeshellarg($tmpDir);
        // -o = overwrite existing files without prompting (required for site updates)
        exec("unzip -o {$escaped} -d {$escapedDest} 2>&1", $out, $rc);
        if ($rc !== 0) {
            // Clean up and fail
            exec("rm -rf " . escapeshellarg($tmpDir));
            throw new \RuntimeException("Extraction ZIP échouée via unzip (code $rc): " . implode('; ', array_slice($out, -3)));
        }

        // Now walk the extracted files and apply prefix/skip logic
        $count = 0;
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($tmpDir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $item) {
            $rel = str_replace($tmpDir . DIRECTORY_SEPARATOR, '', $item->getPathname());
            $rel = str_replace('\\', '/', $rel);
            if ($prefix !== '') {
                if (strpos($rel, $prefix) === 0) {
                    $rel = substr($rel, strlen($prefix));
                } else {
                    continue;
                }
            }
            $rel = ltrim(str_replace('..', '', $rel), '/\\');
            if ($rel === '') continue;
            if ($skip && $skip($rel)) continue;

            $dest = $destDir . '/' . $rel;
            if ($item->isDir()) {
                if (!is_dir($dest)) mkdir($dest, 0755, true);
                continue;
            }
            $parent = dirname($dest);
            if (!is_dir($parent)) mkdir($parent, 0755, true);
            copy($item->getPathname(), $dest);
            $count++;
        }
        exec("rm -rf " . escapeshellarg($tmpDir));
        return $count;
    }

    throw new \RuntimeException(
        "Impossible d'extraire le ZIP : l'extension PHP zip et la commande exec() sont toutes deux indisponibles. " .
        "Veuillez activer l'extension zip dans cPanel (Sélectionner la version PHP → Extensions → zip)."
    );
}

/* ── paths ───────────────────────────────────────────────────────────────── */
$webRoot = rtrim(dirname(__DIR__), '/'); // /home/mauriti2/sunbox-mauritius.com
$apiRoot = $webRoot . '/api';

/* ── shared finfo instance ───────────────────────────────────────────────── */
$finfo = new finfo(FILEINFO_MIME_TYPE);

/* ── process uploads ─────────────────────────────────────────────────────── */
$results   = [];
$anyChange = false;
$allowedMimes = [
    'application/zip',
    'application/x-zip',
    'application/x-zip-compressed',
    'application/octet-stream',
];

// ── dist_zip ─────────────────────────────────────────────────────────────────
if (isset($_FILES['dist_zip']) && $_FILES['dist_zip']['error'] === UPLOAD_ERR_OK) {
    $tmp  = $_FILES['dist_zip']['tmp_name'];
    $orig = basename($_FILES['dist_zip']['name'] ?? 'dist.zip');

    if (!in_array($finfo->file($tmp), $allowedMimes, true)) {
        deployFail('dist_zip: format invalide — un fichier ZIP est requis.');
    }
    try { $names = zipEntryNames($tmp); }
    catch (\RuntimeException $e) { deployFail('dist_zip: ' . $e->getMessage()); }

    // Must contain index.html (Vite dist marker) — case-sensitive
    $hasIndexHtml = (bool) array_filter($names, fn($n) => preg_match('#(^|/)index\.html$#', $n));
    if (!$hasIndexHtml) deployFail('dist_zip: index.html introuvable — ceci ne semble pas être un artefact Vite dist.');

    $prefix = detectSingleTopLevelDir($names);
    try {
        $count = extractZipTo($tmp, $webRoot, $prefix, fn($rel) => strpos($rel, 'api/') === 0);
        $results['dist'] = ['status' => 'ok', 'file' => $orig, 'extracted' => $count];
        $anyChange = true;
    } catch (\RuntimeException $e) { deployFail('dist_zip extraction: ' . $e->getMessage(), 500); }

} elseif (isset($_FILES['dist_zip']) && $_FILES['dist_zip']['error'] !== UPLOAD_ERR_NO_FILE) {
    deployFail('dist_zip: erreur upload (code ' . $_FILES['dist_zip']['error'] . ').');
}

// ── api_zip ───────────────────────────────────────────────────────────────────
if (isset($_FILES['api_zip']) && $_FILES['api_zip']['error'] === UPLOAD_ERR_OK) {
    $tmp  = $_FILES['api_zip']['tmp_name'];
    $orig = basename($_FILES['api_zip']['name'] ?? 'api.zip');

    if (!in_array($finfo->file($tmp), $allowedMimes, true)) {
        deployFail('api_zip: format invalide — un fichier ZIP est requis.');
    }
    try { $names = zipEntryNames($tmp); }
    catch (\RuntimeException $e) { deployFail('api_zip: ' . $e->getMessage()); }

    // Must contain index.php (Sunbox API marker) — case-sensitive
    $hasIndexPhp = (bool) array_filter($names, fn($n) => preg_match('#(^|/)index\.php$#', $n));
    if (!$hasIndexPhp) deployFail('api_zip: index.php introuvable — ceci ne semble pas être l\'artefact API Sunbox.');

    $prefix = detectSingleTopLevelDir($names);
    try {
        $count = extractZipTo($tmp, $apiRoot, $prefix);
        $results['api'] = ['status' => 'ok', 'file' => $orig, 'extracted' => $count];
        $anyChange = true;
    } catch (\RuntimeException $e) { deployFail('api_zip extraction: ' . $e->getMessage(), 500); }

} elseif (isset($_FILES['api_zip']) && $_FILES['api_zip']['error'] !== UPLOAD_ERR_NO_FILE) {
    deployFail('api_zip: erreur upload (code ' . $_FILES['api_zip']['error'] . ').');
}

if (!$anyChange) {
    deployFail('Aucun fichier fourni. Envoyez dist_zip et/ou api_zip.');
}

// ── Auto-propagate API templates to existing pro sites ───────────────────────
// When a new API is deployed, copy the non-site-specific template files to every
// existing pro site so they pick up new endpoints (e.g. get_model_requests)
// without requiring a manual "deploy_pro_site" per site.
// Only files without site-specific content are refreshed here; config.php
// (which holds .env-driven credentials) is left untouched.
if (isset($results['api'])) {
    $templateDir = $apiRoot . '/pro_deploy';
    $proFiles = [
        $templateDir . '/api_index.php'       => 'index.php',
        $templateDir . '/api_pro_auth.php'    => 'pro_auth.php',
        $templateDir . '/api_upload_logo.php' => 'upload_logo.php',
    ];
    $prosDir      = $webRoot . '/pros';
    $proUpdated   = 0;
    $proWarnings  = [];
    if (is_dir($prosDir)) {
        $proApiDirs = glob($prosDir . '/*/api');
        if ($proApiDirs === false) {
            $proWarnings[] = 'glob() échoué pour ' . $prosDir . ' — sites pro non mis à jour automatiquement.';
        } else {
            foreach ($proApiDirs as $proApiDir) {
                if (!is_dir($proApiDir)) continue;
                foreach ($proFiles as $src => $destFile) {
                    if (!is_file($src)) continue;
                    if (!copy($src, $proApiDir . '/' . $destFile)) {
                        $proWarnings[] = 'Échec copie ' . $destFile . ' vers ' . $proApiDir;
                    }
                }
                $proUpdated++;
            }
        }
    }
    if ($proUpdated > 0) {
        $results['api']['pro_sites_updated'] = $proUpdated;
    }
    if (!empty($proWarnings)) {
        $results['api']['pro_sites_warnings'] = $proWarnings;
    }
}

/* ── version log ─────────────────────────────────────────────────────────── */
$versionLine = date('Y-m-d H:i:s') . ' | ' .
    implode(' | ', array_map(
        fn($k, $v) => "$k: {$v['file']} ({$v['extracted']} fichiers)",
        array_keys($results), array_values($results)
    ));
@file_put_contents($webRoot . '/.sunbox_version', $versionLine . "\n", FILE_APPEND);
$versionLog = trim(@file_get_contents($webRoot . '/.sunbox_version') ?: '');

echo json_encode([
    'success'     => true,
    'results'     => $results,
    'version'     => $versionLine,
    'version_log' => $versionLog,
], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => API_DEBUG ? $e->getMessage() : 'Erreur interne du serveur.',
    ], JSON_UNESCAPED_UNICODE);
}
