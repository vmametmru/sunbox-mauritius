<?php
/**
 * Pro Site – Logo Upload
 * Stores menu logo (150px) and PDF logo (300px) in the pro site's own /uploads/ directory.
 * Identical in behaviour to Sunbox's upload_logo.php.
 */

header('Content-Type: application/json');

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
    echo json_encode(['error' => 'Format non autorisé (JPEG, PNG ou WebP)']);
    exit;
}

$uploadDir = dirname(__DIR__) . '/uploads/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

switch ($file['type']) {
    case 'image/jpeg': $srcImage = @imagecreatefromjpeg($file['tmp_name']); break;
    case 'image/png':  $srcImage = @imagecreatefrompng($file['tmp_name']); break;
    case 'image/webp': $srcImage = @imagecreatefromwebp($file['tmp_name']); break;
    default: $srcImage = false;
}

if (!$srcImage) {
    http_response_code(500);
    echo json_encode(['error' => 'Impossible de lire l\'image']);
    exit;
}

function resizeAndSave($srcImage, int $maxHeight, string $destPath): void
{
    $srcW  = imagesx($srcImage);
    $srcH  = imagesy($srcImage);
    $ratio = $srcW / $srcH;
    $newH  = $maxHeight;
    $newW  = (int)round($newH * $ratio);

    $dst = imagecreatetruecolor($newW, $newH);
    imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
    imagecopyresampled($dst, $srcImage, 0, 0, 0, 0, $newW, $newH, $srcW, $srcH);
    imagejpeg($dst, $destPath, 90);
    imagedestroy($dst);
}

resizeAndSave($srcImage, 150, $uploadDir . 'logo-menu.jpg');
resizeAndSave($srcImage, 300, $uploadDir . 'logo-pdf.jpg');
imagedestroy($srcImage);

echo json_encode([
    'success'       => true,
    'menu_logo_url' => '/uploads/logo-menu.jpg',
    'pdf_logo_url'  => '/uploads/logo-pdf.jpg',
]);
