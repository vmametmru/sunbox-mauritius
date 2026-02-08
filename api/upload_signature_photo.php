<?php
// upload_signature_photo.php
// Uploads signature photos to /uploads/id-photos/

header('Content-Type: application/json');

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
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
    echo json_encode(['error' => 'Format d\'image non autorisé (JPEG, PNG, WebP uniquement)']);
    exit;
}

// Check file size (max 5MB)
if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'Fichier trop volumineux (max 5MB)']);
    exit;
}

// Destination path - use existing id-photos directory
$uploadDir = __DIR__ . '/../uploads/id-photos/';
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Impossible de créer le répertoire de destination']);
        exit;
    }
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
if (empty($extension)) {
    $extension = 'jpg'; // Default extension
}
$filename = 'photo_' . uniqid() . '_' . time() . '.' . strtolower($extension);
$destPath = $uploadDir . $filename;

// Load source image
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
    echo json_encode(['error' => 'Erreur lors de la lecture de l\'image']);
    exit;
}

// Resize image to max 200x200 while maintaining aspect ratio
$srcWidth = imagesx($srcImage);
$srcHeight = imagesy($srcImage);
$maxSize = 200;

if ($srcWidth > $maxSize || $srcHeight > $maxSize) {
    if ($srcWidth > $srcHeight) {
        $newWidth = $maxSize;
        $newHeight = intval($srcHeight * ($maxSize / $srcWidth));
    } else {
        $newHeight = $maxSize;
        $newWidth = intval($srcWidth * ($maxSize / $srcHeight));
    }
    
    $resized = imagecreatetruecolor($newWidth, $newHeight);
    
    // Preserve transparency for PNG
    if ($file['type'] === 'image/png') {
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        $transparent = imagecolorallocatealpha($resized, 255, 255, 255, 127);
        imagefill($resized, 0, 0, $transparent);
    } else {
        imagefill($resized, 0, 0, imagecolorallocate($resized, 255, 255, 255));
    }
    
    imagecopyresampled($resized, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $srcWidth, $srcHeight);
    
    // Save as JPEG
    imagejpeg($resized, $destPath, 90);
    imagedestroy($resized);
} else {
    // Save without resizing
    imagejpeg($srcImage, $destPath, 90);
}

imagedestroy($srcImage);

// Return the URL
$photoUrl = '/uploads/id-photos/' . $filename;

echo json_encode([
    'success' => true,
    'url' => $photoUrl
]);
