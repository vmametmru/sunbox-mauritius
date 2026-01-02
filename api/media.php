<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

handleCORS();
startSession();
requireAdmin();

function fail(string $msg, int $code = 400): void { errorResponse($msg, $code); }
function ok(array $data = []): void { successResponse($data); }

$action = $_GET['action'] ?? '';
$db = getDB();

/**
 * ✅ Nouvelle limite
 */
$MAX_BYTES = 20 * 1024 * 1024; // 20MB

/**
 * ✅ On accepte l’upload en jpeg/png/webp,
 * mais on convertit tout en JPG.
 */
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

/**
 * ✅ Upload + resize (max 1920px wide) + convert to JPG
 * Field attendu: $_FILES['file']
 */
function uploadOne(string $folder, array $allowedMime, int $maxBytes): array {
  if (empty($_FILES['file']) || !isset($_FILES['file']['tmp_name'])) {
    fail("Fichier manquant (field name = file).", 400);
  }

  $f = $_FILES['file'];

  if (!empty($f['error'])) {
    fail("Erreur upload: " . (string)$f['error'], 400);
  }

  if (($f['size'] ?? 0) <= 0 || $f['size'] > $maxBytes) {
    fail("Taille invalide (max " . (int)($maxBytes/1024/1024) . "MB).", 400);
  }

  $tmp = (string)$f['tmp_name'];

  $fi = finfo_open(FILEINFO_MIME_TYPE);
  $mime = finfo_file($fi, $tmp) ?: '';
  finfo_close($fi);

  if (!isset($allowedMime[$mime])) {
    fail("Type non autorisé: $mime. Autorisés: jpg, png, webp.", 400);
  }

  $absFolder = dirname(__DIR__) . '/' . trim($folder, '/'); // ex: /home/.../uploads/models
  if (!is_dir($absFolder)) {
    fail("Dossier cible introuvable: $absFolder", 500);
  }
  if (!is_writable($absFolder)) {
    fail("Dossier non inscriptible (permissions): $absFolder", 500);
  }

  // Load image
  $src = loadImageResource($mime, $tmp);
  if (!$src) fail("Impossible de lire l'image (GD/webp?).", 400);

  // EXIF orientation for JPEG
  if ($mime === 'image/jpeg') {
    $src = applyExifOrientationIfPossible($src, $tmp);
  }

  $srcW = imagesx($src);
  $srcH = imagesy($src);

  // Resize to max width 1920
  $targetW = $srcW;
  $targetH = $srcH;
  $maxW = 1920;

  if ($srcW > $maxW) {
    $ratio = $maxW / $srcW;
    $targetW = $maxW;
    $targetH = (int)round($srcH * $ratio);
  }

  $dst = imagecreatetruecolor($targetW, $targetH);

  // White background (important for PNG/WebP transparency when converting to JPG)
  $white = imagecolorallocate($dst, 255, 255, 255);
  imagefilledrectangle($dst, 0, 0, $targetW, $targetH, $white);

  imagecopyresampled($dst, $src, 0, 0, 0, 0, $targetW, $targetH, $srcW, $srcH);

  // Save as JPG
  $name = safeRandomNameJpg();
  $relPath = trim($folder, '/') . '/' . $name;
  $absPath = dirname(__DIR__) . '/' . $relPath;

  $quality = 85;
  if (!imagejpeg($dst, $absPath, $quality)) {
    imagedestroy($src);
    imagedestroy($dst);
    fail("Impossible d'enregistrer le JPG.", 500);
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

try {
  switch ($action) {

    // ========== MODELS ==========
    case 'model_list': {
      $modelId = (int)($_GET['model_id'] ?? 0);
      if ($modelId <= 0) fail("model_id manquant.", 400);

      $stmt = $db->prepare("SELECT * FROM model_images WHERE model_id = ? ORDER BY is_primary DESC, sort_order ASC, id DESC");
      $stmt->execute([$modelId]);
      ok(['items' => $stmt->fetchAll()]);
      break;
    }

    case 'model_upload': {
  $modelId = (int)($_GET['model_id'] ?? 0);
  if ($modelId <= 0) fail("model_id manquant.", 400);

  // Upload (convert + resize déjà OK chez toi)
  $up = uploadOne('uploads/models', $ALLOWED_MIME, $MAX_BYTES);

  // Est-ce la première image ?
  $stmt = $db->prepare("SELECT COUNT(*) AS c FROM model_images WHERE model_id = ?");
  $stmt->execute([$modelId]);
  $count = (int)($stmt->fetch()['c'] ?? 0);

  // Insert
  $stmt = $db->prepare("INSERT INTO model_images (model_id, file_path, is_primary) VALUES (?, ?, ?)");
  $stmt->execute([$modelId, $up['relative'], $count === 0 ? 1 : 0]);

  // Sync models.image_url
  syncModelImageUrl($db, $modelId);

  ok(['file' => $up]);
  break;
}

case 'model_delete': {
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) fail("id manquant.", 400);

  // On récupère model_id + file_path AVANT suppression
  $stmt = $db->prepare("SELECT model_id, file_path FROM model_images WHERE id = ?");
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  if (!$row) fail("Image introuvable.", 404);

  $modelId = (int)$row['model_id'];
  $filePath = (string)$row['file_path'];

  // Supprime la ligne en base
  $stmt = $db->prepare("DELETE FROM model_images WHERE id = ?");
  $stmt->execute([$id]);

  // Supprime le fichier sur disque
  $abs = dirname(__DIR__) . '/' . ltrim($filePath, '/');
  if (is_file($abs)) @unlink($abs);

  // Met à jour models.image_url vers la prochaine image (primary ou plus récente)
  syncModelImageUrl($db, $modelId);

  ok(['deleted' => true]);
  break;
}

    case 'model_set_primary': {
      $id = (int)($_GET['id'] ?? 0);
      if ($id <= 0) fail("id manquant.", 400);

      $stmt = $db->prepare("SELECT model_id FROM model_images WHERE id = ?");
      $stmt->execute([$id]);
      $row = $stmt->fetch();
      if (!$row) fail("Image introuvable.", 404);

      $modelId = (int)$row['model_id'];
      $db->prepare("UPDATE model_images SET is_primary = 0 WHERE model_id = ?")->execute([$modelId]);
      $db->prepare("UPDATE model_images SET is_primary = 1 WHERE id = ?")->execute([$id]);

      syncModelImageUrl($db, $modelId);
      ok(['primary' => true]);
      break;
    }

    default:
      fail("Action invalide.", 400);
  }

} catch (Throwable $e) {
  error_log("media.php error: " . $e->getMessage());
  fail(API_DEBUG ? $e->getMessage() : "Server error", 500);
}

function syncModelImageUrl(PDO $db, int $modelId): void {
  // prend l'image principale, sinon la plus récente
  $stmt = $db->prepare("
    SELECT file_path
    FROM model_images
    WHERE model_id = ?
    ORDER BY is_primary DESC, sort_order ASC, id DESC
    LIMIT 1
  ");
  $stmt->execute([$modelId]);
  $row = $stmt->fetch();

  $url = '';
  if ($row && !empty($row['file_path'])) {
    $url = '/' . ltrim((string)$row['file_path'], '/'); // ex: /uploads/models/xxx.jpg
  }

  $up = $db->prepare("UPDATE models SET image_url = ? WHERE id = ?");
  $up->execute([$url, $modelId]);
}
