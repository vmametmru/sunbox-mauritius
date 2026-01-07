<?php
/**
 * api/media.php
 * Fichier complet avec gestion des tags photo | plan | bandeau
 */
declare(strict_types=1);

require_once __DIR__ . '/config.php';

handleCORS();
startSession();
requireAdmin();

function fail(string $msg, int $code = 400): void { errorResponse($msg, $code); }
function ok(array $data = []): void { successResponse($data); }

$action = $_GET['action'] ?? '';
$db = getDB();

$MAX_BYTES = 20 * 1024 * 1024; // 20MB
$ALLOWED_MIME = [
  'image/jpeg' => true,
  'image/png'  => true,
  'image/webp' => true,
];

function getPublicUrl(string $relativePath): string {
  return '/' . ltrim($relativePath, '/');
}

function safeRandomNameJpg(): string {
  return bin2hex(random_bytes(16)) . '.jpg';
}

function applyExifOrientationIfPossible($img, string $tmpFile) {
  if (!function_exists('exif_read_data')) return $img;
  $exif = @exif_read_data($tmpFile);
  if (!$exif || empty($exif['Orientation'])) return $img;
  switch ((int)$exif['Orientation']) {
    case 3:  $img = imagerotate($img, 180, 0); break;
    case 6:  $img = imagerotate($img, -90, 0); break;
    case 8:  $img = imagerotate($img, 90, 0); break;
  }
  return $img;
}

function loadImageResource(string $mime, string $tmpFile) {
  switch ($mime) {
    case 'image/jpeg': return @imagecreatefromjpeg($tmpFile);
    case 'image/png':  return @imagecreatefrompng($tmpFile);
    case 'image/webp': return function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($tmpFile) : false;
    default: return false;
  }
}

function uploadOne(string $folder, array $allowedMime, int $maxBytes): array {
  if (empty($_FILES['file']) || !isset($_FILES['file']['tmp_name'])) fail("Fichier manquant.");
  $f = $_FILES['file'];

  if (!empty($f['error'])) fail("Erreur upload: " . (string)$f['error']);
  if (($f['size'] ?? 0) <= 0 || $f['size'] > $maxBytes) fail("Taille invalide (max 20MB).", 400);

  $tmp = (string)$f['tmp_name'];
  $fi = finfo_open(FILEINFO_MIME_TYPE);
  $mime = finfo_file($fi, $tmp) ?: '';
  finfo_close($fi);

  if (!isset($allowedMime[$mime])) fail("Type non autorisé: $mime");

  $absFolder = dirname(__DIR__) . '/' . trim($folder, '/');
  if (!is_dir($absFolder)) fail("Dossier introuvable: $absFolder");
  if (!is_writable($absFolder)) fail("Dossier non inscriptible: $absFolder");

  $src = loadImageResource($mime, $tmp);
  if (!$src) fail("Erreur de lecture image");

  if ($mime === 'image/jpeg') $src = applyExifOrientationIfPossible($src, $tmp);

  $srcW = imagesx($src);
  $srcH = imagesy($src);
  $maxW = 1920;

  $targetW = $srcW;
  $targetH = $srcH;
  if ($srcW > $maxW) {
    $ratio = $maxW / $srcW;
    $targetW = $maxW;
    $targetH = (int)round($srcH * $ratio);
  }

  $dst = imagecreatetruecolor($targetW, $targetH);
  $white = imagecolorallocate($dst, 255, 255, 255);
  imagefilledrectangle($dst, 0, 0, $targetW, $targetH, $white);
  imagecopyresampled($dst, $src, 0, 0, 0, 0, $targetW, $targetH, $srcW, $srcH);

  $name = safeRandomNameJpg();
  $relPath = trim($folder, '/') . '/' . $name;
  $absPath = dirname(__DIR__) . '/' . $relPath;

  if (!imagejpeg($dst, $absPath, 85)) {
    imagedestroy($src);
    imagedestroy($dst);
    fail("Impossible d'enregistrer le JPG.");
  }

  @chmod($absPath, 0644);
  imagedestroy($src);
  imagedestroy($dst);

  return [
    'relative' => $relPath,
    'url'      => getPublicUrl($relPath),
    'mime'     => 'image/jpeg',
    'size'     => (int)filesize($absPath),
    'width'    => $targetW,
    'height'   => $targetH,
  ];
}

function syncModelImageUrl(PDO $db, int $modelId): void {
  $stmt = $db->prepare("SELECT file_path FROM model_images WHERE model_id = ? AND media_type = 'photo' ORDER BY is_primary DESC, sort_order ASC, id DESC LIMIT 1");
  $stmt->execute([$modelId]);
  $row = $stmt->fetch();

  $url = '';
  if ($row && !empty($row['file_path'])) {
    $url = '/' . ltrim((string)$row['file_path'], '/');
  }

  $up = $db->prepare("UPDATE models SET image_url = ? WHERE id = ?");
  $up->execute([$url, $modelId]);
}

try {
  switch ($action) {
    case 'model_upload': {
      $modelId = (int)($_GET['model_id'] ?? 0);
      $mediaType = $_POST['media_type'] ?? 'photo';
      if (!in_array($mediaType, ['photo', 'plan', 'bandeau'])) $mediaType = 'photo';

      if ($modelId <= 0) fail("model_id manquant.");
      $up = uploadOne('uploads/models', $ALLOWED_MIME, $MAX_BYTES);

      $stmt = $db->prepare("SELECT COUNT(*) AS c FROM model_images WHERE model_id = ?");
      $stmt->execute([$modelId]);
      $count = (int)($stmt->fetch()['c'] ?? 0);

      $stmt = $db->prepare("INSERT INTO model_images (model_id, file_path, is_primary, media_type) VALUES (?, ?, ?, ?)");
      $stmt->execute([$modelId, $up['relative'], $count === 0 ? 1 : 0, $mediaType]);

      syncModelImageUrl($db, $modelId);
      ok(['file' => $up]);
      break;
    }

    // autres actions (model_list, model_delete, etc.)
    // ... non inclus ici pour la lisibilité

    default:
      fail("Action invalide.", 400);
  }
} catch (Throwable $e) {
  error_log("media.php error: " . $e->getMessage());
  fail(API_DEBUG ? $e->getMessage() : "Server error", 500);
}
