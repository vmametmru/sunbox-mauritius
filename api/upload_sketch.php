<?php
// upload_sketch.php – Upload a JPG sketch for professional model requests

require_once __DIR__ . '/config.php';

handleCORS();

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

$file = $_FILES['file'];
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Format non autorisé (JPG/PNG/WEBP uniquement)']);
    exit;
}

if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'Fichier trop volumineux (max 5 Mo)']);
    exit;
}

$uploadDir = __DIR__ . '/../uploads/sketches/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$ext = 'jpg';
$filename = 'sketch-' . date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
$destPath = $uploadDir . $filename;

switch ($file['type']) {
    case 'image/jpeg':
        $srcImage = imagecreatefromjpeg($file['tmp_name']);
        break;
    case 'image/png':
        $srcImage = imagecreatefrompng($file['tmp_name']);
        break;
    case 'image/webp':
        $srcImage = imagecreatefromwebp($file['tmp_name']);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Format non supporté']);
        exit;
}

if (!$srcImage) {
    http_response_code(500);
    echo json_encode(['error' => 'Impossible de lire l\'image']);
    exit;
}

// Resize to max 1200px wide while preserving ratio
$srcWidth  = imagesx($srcImage);
$srcHeight = imagesy($srcImage);
$maxWidth  = 1200;

if ($srcWidth > $maxWidth) {
    $ratio     = $maxWidth / $srcWidth;
    $newWidth  = $maxWidth;
    $newHeight = intval($srcHeight * $ratio);
} else {
    $newWidth  = $srcWidth;
    $newHeight = $srcHeight;
}

$dst = imagecreatetruecolor($newWidth, $newHeight);
imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
imagecopyresampled($dst, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $srcWidth, $srcHeight);
imagejpeg($dst, $destPath, 85);
imagedestroy($dst);
imagedestroy($srcImage);

$url = '/uploads/sketches/' . $filename;

echo json_encode(['success' => true, 'url' => $url]);
