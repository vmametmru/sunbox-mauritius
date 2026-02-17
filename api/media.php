<?php
declare(strict_types=1);

/**
 * api/media.php
 * Gestion complète des médias :
 * - photo (liée à un modèle)
 * - plan  (liée à un modèle)
 * - bandeau (model_id = 0)
 */

require_once __DIR__ . '/config.php';

handleCORS();
startSession();
// Note: requireAdmin() is called only for write operations (upload, delete, set_primary)

/* =========================================================
   Helpers
========================================================= */
function fail(string $msg, int $code = 400): void {
  errorResponse($msg, $code);
}

function ok(array $data = []): void {
  successResponse($data);
}

$db = getDB();
$action = $_GET['action'] ?? '';

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

/* =========================================================
   Image utils
========================================================= */
function applyExifOrientationIfPossible($img, string $tmpFile) {
  if (!function_exists('exif_read_data')) return $img;
  $exif = @exif_read_data($tmpFile);
  if (!$exif || empty($exif['Orientation'])) return $img;

  switch ((int)$exif['Orientation']) {
    case 3: return imagerotate($img, 180, 0);
    case 6: return imagerotate($img, -90, 0);
    case 8: return imagerotate($img, 90, 0);
  }
  return $img;
}

function loadImageResource(string $mime, string $tmpFile) {
  switch ($mime) {
    case 'image/jpeg': return @imagecreatefromjpeg($tmpFile);
    case 'image/png':  return @imagecreatefrompng($tmpFile);
    case 'image/webp': return function_exists('imagecreatefromwebp')
      ? @imagecreatefromwebp($tmpFile)
      : false;
    default: return false;
  }
}

/* =========================================================
   Upload + resize + convert JPG
========================================================= */
function uploadOne(string $folder, array $allowedMime, int $maxBytes): array {
  if (empty($_FILES['file']['tmp_name'])) fail("Fichier manquant.");

  $f = $_FILES['file'];
  if ($f['error'] !== UPLOAD_ERR_OK) fail("Erreur upload.");
  if ($f['size'] <= 0 || $f['size'] > $maxBytes) fail("Fichier trop lourd.");

  $tmp = $f['tmp_name'];

  $fi = finfo_open(FILEINFO_MIME_TYPE);
  $mime = finfo_file($fi, $tmp);
  finfo_close($fi);

  if (!isset($allowedMime[$mime])) fail("Type non autorisé.");

  $src = loadImageResource($mime, $tmp);
  if (!$src) fail("Impossible de lire l'image.");

  if ($mime === 'image/jpeg') {
    $src = applyExifOrientationIfPossible($src, $tmp);
  }

  $srcW = imagesx($src);
  $srcH = imagesy($src);
  $maxW = 1920;

  $dstW = $srcW;
  $dstH = $srcH;

  if ($srcW > $maxW) {
    $ratio = $maxW / $srcW;
    $dstW = $maxW;
    $dstH = (int)round($srcH * $ratio);
  }

  $dst = imagecreatetruecolor($dstW, $dstH);
  $white = imagecolorallocate($dst, 255, 255, 255);
  imagefilledrectangle($dst, 0, 0, $dstW, $dstH, $white);
  imagecopyresampled($dst, $src, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);

  $name = safeRandomNameJpg();
  $relPath = trim($folder, '/') . '/' . $name;
  $absPath = dirname(__DIR__) . '/' . $relPath;

  // Create the upload directory if it doesn't exist
  $uploadDir = dirname($absPath);
  if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
      fail("Erreur création dossier d'upload.");
    }
  }

  if (!imagejpeg($dst, $absPath, 85)) {
    fail("Erreur écriture JPG.");
  }

  imagedestroy($src);
  imagedestroy($dst);

  return [
    'relative' => $relPath,
    'url'      => getPublicUrl($relPath),
  ];
}

/* =========================================================
   Sync image principale du modèle
========================================================= */
function syncModelImageUrl(PDO $db, int $modelId): void {
  if ($modelId <= 0) return;

  $stmt = $db->prepare("
    SELECT file_path
    FROM model_images
    WHERE model_id = ?
      AND media_type = 'photo'
    ORDER BY is_primary DESC, id DESC
    LIMIT 1
  ");
  $stmt->execute([$modelId]);
  $row = $stmt->fetch();

  $url = $row ? '/' . ltrim($row['file_path'], '/') : '';

  $db->prepare("UPDATE models SET image_url = ? WHERE id = ?")
     ->execute([$url, $modelId]);
}

/* =========================================================
   ACTIONS
========================================================= */
try {

  switch ($action) {

    /* ---------- LISTE IMAGES (model ou bandeau) ---------- */
    case 'model_list': {
      $modelId = (int)($_GET['model_id'] ?? -1);

      $stmt = $db->prepare("
        SELECT *
        FROM model_images
        WHERE model_id = ?
        ORDER BY is_primary DESC, id DESC
      ");
      $stmt->execute([$modelId]);

      ok(['items' => $stmt->fetchAll()]);
      break;
    }

    /* ---------- LISTE IMAGES PAR TYPE DE MEDIA ---------- */
    case 'list_by_media_type': {
      $mediaType = $_GET['media_type'] ?? '';

      if (!in_array($mediaType, ['photo', 'plan', 'bandeau', 'category_image'], true)) {
        fail("media_type invalide.");
      }

      $stmt = $db->prepare("
        SELECT mi.*, m.name as model_name, m.type as model_type
        FROM model_images mi
        LEFT JOIN models m ON m.id = mi.model_id
        WHERE mi.media_type = ?
        ORDER BY mi.is_primary DESC, mi.id DESC
      ");
      $stmt->execute([$mediaType]);

      ok(['items' => $stmt->fetchAll()]);
      break;
    }

    /* ---------- LISTE IMAGES MODELES (photo + plan) ---------- */
    case 'list_model_images': {
      $modelId = isset($_GET['model_id']) ? (int)$_GET['model_id'] : null;
      $imageType = $_GET['image_type'] ?? null; // 'photo' or 'plan'

      $sql = "
        SELECT mi.*, m.name as model_name, m.type as model_type
        FROM model_images mi
        LEFT JOIN models m ON m.id = mi.model_id
        WHERE mi.media_type IN ('photo', 'plan')
      ";
      $params = [];

      if ($modelId !== null && $modelId > 0) {
        $sql .= " AND mi.model_id = ?";
        $params[] = $modelId;
      }

      if ($imageType !== null && in_array($imageType, ['photo', 'plan'], true)) {
        $sql .= " AND mi.media_type = ?";
        $params[] = $imageType;
      }

      $sql .= " ORDER BY mi.model_id, mi.is_primary DESC, mi.id DESC";

      $stmt = $db->prepare($sql);
      $stmt->execute($params);

      ok(['items' => $stmt->fetchAll()]);
      break;
    }

    /* ---------- UPLOAD ---------- */
    case 'model_upload': {
      requireAdmin();
      $modelId   = (int)($_GET['model_id'] ?? 0);
      $mediaType = $_POST['media_type'] ?? 'photo';

      if (!in_array($mediaType, ['photo','plan','bandeau','category_image'], true)) {
        $mediaType = 'photo';
      }

      // category_image and bandeau don't need model_id
      if (!in_array($mediaType, ['bandeau', 'category_image'], true) && $modelId <= 0) {
        fail("model_id requis.");
      }

      // category_image and bandeau have model_id = 0
      if (in_array($mediaType, ['bandeau', 'category_image'], true)) {
        $modelId = 0;
      }

      $up = uploadOne('uploads/models', $ALLOWED_MIME, $MAX_BYTES);

      $countStmt = $db->prepare(
        "SELECT COUNT(*) FROM model_images WHERE model_id = ? AND media_type = 'photo'"
      );
      $countStmt->execute([$modelId]);
      $count = (int)$countStmt->fetchColumn();

      $stmt = $db->prepare("
        INSERT INTO model_images (model_id, file_path, is_primary, media_type)
        VALUES (?, ?, ?, ?)
      ");
      $stmt->execute([
        $modelId,
        $up['relative'],
        $mediaType === 'photo' && $count === 0 ? 1 : 0,
        $mediaType
      ]);

      $insertedId = $db->lastInsertId();
      syncModelImageUrl($db, $modelId);
      ok(['file' => $up, 'id' => (int)$insertedId]);
      break;
    }

    /* ---------- DELETE ---------- */
    case 'model_delete': {
      requireAdmin();
      $id = (int)($_GET['id'] ?? 0);
      if ($id <= 0) fail("id manquant.");

      $stmt = $db->prepare("SELECT model_id, file_path FROM model_images WHERE id = ?");
      $stmt->execute([$id]);
      $row = $stmt->fetch();
      if (!$row) fail("Image introuvable.");

      $db->prepare("DELETE FROM model_images WHERE id = ?")->execute([$id]);

      $abs = dirname(__DIR__) . '/' . ltrim($row['file_path'], '/');
      if (is_file($abs)) @unlink($abs);

      syncModelImageUrl($db, (int)$row['model_id']);
      ok(['deleted' => true]);
      break;
    }

    /* ---------- SET PRIMARY ---------- */
    case 'model_set_primary': {
      requireAdmin();
      $id = (int)($_GET['id'] ?? 0);
      if ($id <= 0) fail("id manquant.");

      $stmt = $db->prepare("SELECT model_id FROM model_images WHERE id = ?");
      $stmt->execute([$id]);
      $row = $stmt->fetch();
      if (!$row) fail("Image introuvable.");

      $modelId = (int)$row['model_id'];

      $db->prepare("UPDATE model_images SET is_primary = 0 WHERE model_id = ?")
         ->execute([$modelId]);
      $db->prepare("UPDATE model_images SET is_primary = 1 WHERE id = ?")
         ->execute([$id]);

      syncModelImageUrl($db, $modelId);
      ok(['primary' => true]);
      break;
    }

    /* ---------- BANNIÈRES (PUBLIC) ---------- */
    case 'get_banner_images': {
      $stmt = $db->query("
        SELECT id, file_path
        FROM model_images
        WHERE media_type = 'bandeau'
        ORDER BY id DESC
      ");

      $rows = array_map(fn($r) => [
        'id'  => (int)$r['id'],
        'url' => '/' . ltrim($r['file_path'], '/'),
      ], $stmt->fetchAll());

      ok($rows);
      break;
    }

    /* ---------- FREE QUOTE PHOTO UPLOAD ---------- */
    case 'free_quote_upload': {
      requireAdmin();
      $mediaType = $_POST['media_type'] ?? 'photo';

      if (!in_array($mediaType, ['photo','plan'], true)) {
        $mediaType = 'photo';
      }

      $up = uploadOne('uploads/free-quotes', $ALLOWED_MIME, $MAX_BYTES);

      ok(['file' => $up, 'url' => $up['url']]);
      break;
    }

    default:
      fail("Action invalide.", 400);
  }

} catch (Throwable $e) {
  error_log("media.php error: " . $e->getMessage());
  fail(API_DEBUG ? $e->getMessage() : "Server error", 500);
}
