<?php
/**
 * Pro Site — Image Upload (header banner / sketches)
 *
 * Mirrors api/upload_sketch.php from the main Sunbox site.
 * Stores uploaded images in /uploads/sketches/ inside the pro site directory
 * and returns an ABSOLUTE URL so that images can be served from this pro domain
 * and stored in the Sunbox main DB (professional_profiles.header_images_json).
 */

header('Content-Type: application/json');

// ── Minimal .env parser (same approach as index.php — no autoloader available) ─
function uploadParseEnv(string $path): array
{
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

$proEnv    = uploadParseEnv(__DIR__ . '/../.env');
$proAppUrl = rtrim($proEnv['APP_URL'] ?? '', '/');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Fichier manquant']);
    exit;
}

$file         = $_FILES['file'];
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Format non autorisé (JPG, PNG ou WEBP)']);
    exit;
}

if ($file['size'] > 10 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'Fichier trop volumineux (max 10 Mo)']);
    exit;
}

$uploadDir = dirname(__DIR__) . '/uploads/sketches/';
if (!is_dir($uploadDir)) {
    if (!@mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        http_response_code(500);
        echo json_encode(['error' => 'Impossible de créer le répertoire d\'upload']);
        exit;
    }
}

switch ($file['type']) {
    case 'image/jpeg': $srcImage = @imagecreatefromjpeg($file['tmp_name']); break;
    case 'image/png':  $srcImage = @imagecreatefrompng($file['tmp_name']);  break;
    case 'image/webp': $srcImage = @imagecreatefromwebp($file['tmp_name']); break;
    default: $srcImage = false;
}

if (!$srcImage) {
    http_response_code(500);
    echo json_encode(['error' => 'Impossible de lire l\'image']);
    exit;
}

$srcWidth  = imagesx($srcImage);
$srcHeight = imagesy($srcImage);
$maxWidth  = 1920;

if ($srcWidth > $maxWidth) {
    $ratio     = $maxWidth / $srcWidth;
    $newWidth  = $maxWidth;
    $newHeight = (int)round($srcHeight * $ratio);
} else {
    $newWidth  = $srcWidth;
    $newHeight = $srcHeight;
}

$dst = imagecreatetruecolor($newWidth, $newHeight);
imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
imagecopyresampled($dst, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $srcWidth, $srcHeight);

$filename = 'header-' . date('Ymd-His') . '-' . bin2hex(random_bytes(8)) . '.jpg';
$destPath = $uploadDir . $filename;

imagejpeg($dst, $destPath, 88);
imagedestroy($dst);
imagedestroy($srcImage);

// Return absolute URL so the image can be served from this pro domain
$relPath = '/uploads/sketches/' . $filename;
$absUrl  = $proAppUrl !== '' ? ($proAppUrl . $relPath) : $relPath;

echo json_encode(['success' => true, 'url' => $absUrl]);
