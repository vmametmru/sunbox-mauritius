<?php
// upload_logo.php

header('Content-Type: application/json');

// Autoriser uniquement POST
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
    echo json_encode(['error' => 'Format d\'image non autorisé']);
    exit;
}

// Chemin de destination
$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

// Charge l’image source
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
    echo json_encode(['error' => 'Erreur lors de la lecture de l’image']);
    exit;
}

// Fonction de redimensionnement
function resizeAndSave($srcImage, $maxHeight, $destPath) {
    $srcWidth = imagesx($srcImage);
    $srcHeight = imagesy($srcImage);
    $ratio = $srcWidth / $srcHeight;

    $newHeight = $maxHeight;
    $newWidth = intval($newHeight * $ratio);

    $resized = imagecreatetruecolor($newWidth, $newHeight);
    imagefill($resized, 0, 0, imagecolorallocate($resized, 255, 255, 255)); // fond blanc
    imagecopyresampled($resized, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $srcWidth, $srcHeight);
    imagejpeg($resized, $destPath, 90);
    imagedestroy($resized);
}

// Sauvegarde les deux versions
resizeAndSave($srcImage, 150, $uploadDir . 'logo-menu.jpg'); // pour le menu
resizeAndSave($srcImage, 300, $uploadDir . 'logo-pdf.jpg');  // pour les PDF

imagedestroy($srcImage);

echo json_encode([
    'success' => true,
    'menu_logo_url' => '/uploads/logo-menu.jpg',
    'pdf_logo_url' => '/uploads/logo-pdf.jpg'
]);
