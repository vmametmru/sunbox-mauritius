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

$MAX_BYTES = 6 * 1024 * 1024; // 6MB
$ALLOWED_MIME = [
  'image/jpeg' => 'jpg',
  'image/png'  => 'png',
  'image/webp' => 'webp',
];

function getPublicUrl(string $relativePath): string {
  // ex: uploads/models/xxx.jpg -> /uploads/models/xxx.jpg
  return '/' . ltrim($relativePath, '/');
}

function safeRandomName(string $ext): string {
  return bin2hex(random_bytes(16)) . '.' . $ext;
}

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

  $tmp = $f['tmp_name'];
  $fi = finfo_open(FILEINFO_MIME_TYPE);
  $mime = finfo_file($fi, $tmp) ?: '';
  finfo_close($fi);

  if (!isset($allowedMime[$mime])) {
    fail("Type non autorisé: $mime. Autorisés: jpg, png, webp.", 400);
  }

  $ext = $allowedMime[$mime];
  $name = safeRandomName($ext);

  $absFolder = dirname(__DIR__) . '/' . trim($folder, '/'); // public_html/uploads/...
  if (!is_dir($absFolder)) {
    fail("Dossier cible introuvable: $absFolder", 500);
  }

  $relPath = trim($folder, '/') . '/' . $name;              // uploads/models/xxx.jpg
  $absPath = dirname(__DIR__) . '/' . $relPath;             // /home/.../public_html/uploads/models/xxx.jpg

  if (!move_uploaded_file($tmp, $absPath)) {
    fail("Impossible d'enregistrer le fichier.", 500);
  }

  @chmod($absPath, 0644);

  return [
    'relative' => $relPath,
    'url'      => getPublicUrl($relPath),
    'mime'     => $mime,
    'size'     => (int)$f['size'],
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

      $up = uploadOne('uploads/models', $ALLOWED_MIME, $MAX_BYTES);

      $stmt = $db->prepare("INSERT INTO model_images (model_id, file_path) VALUES (?, ?)");
      $stmt->execute([$modelId, $up['relative']]);

      ok(['file' => $up]);
      break;
    }

    case 'model_delete': {
      $id = (int)($_GET['id'] ?? 0);
      if ($id <= 0) fail("id manquant.", 400);

      $stmt = $db->prepare("SELECT file_path FROM model_images WHERE id = ?");
      $stmt->execute([$id]);
      $row = $stmt->fetch();
      if (!$row) fail("Image introuvable.", 404);

      $stmt = $db->prepare("DELETE FROM model_images WHERE id = ?");
      $stmt->execute([$id]);

      $abs = dirname(__DIR__) . '/' . ltrim($row['file_path'], '/');
      if (is_file($abs)) @unlink($abs);

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

      ok(['primary' => true]);
      break;
    }


    // ========== PLANS ==========
    case 'plan_list': {
      $planId = (int)($_GET['plan_id'] ?? 0);
      if ($planId <= 0) fail("plan_id manquant.", 400);

      $stmt = $db->prepare("SELECT * FROM plan_images WHERE plan_id = ? ORDER BY is_primary DESC, sort_order ASC, id DESC");
      $stmt->execute([$planId]);
      ok(['items' => $stmt->fetchAll()]);
      break;
    }

    case 'plan_upload': {
      $planId = (int)($_GET['plan_id'] ?? 0);
      if ($planId <= 0) fail("plan_id manquant.", 400);

      $up = uploadOne('uploads/plans', $ALLOWED_MIME, $MAX_BYTES);

      $stmt = $db->prepare("INSERT INTO plan_images (plan_id, file_path) VALUES (?, ?)");
      $stmt->execute([$planId, $up['relative']]);

      ok(['file' => $up]);
      break;
    }

    case 'plan_delete': {
      $id = (int)($_GET['id'] ?? 0);
      if ($id <= 0) fail("id manquant.", 400);

      $stmt = $db->prepare("SELECT file_path FROM plan_images WHERE id = ?");
      $stmt->execute([$id]);
      $row = $stmt->fetch();
      if (!$row) fail("Image introuvable.", 404);

      $db->prepare("DELETE FROM plan_images WHERE id = ?")->execute([$id]);

      $abs = dirname(__DIR__) . '/' . ltrim($row['file_path'], '/');
      if (is_file($abs)) @unlink($abs);

      ok(['deleted' => true]);
      break;
    }

    case 'plan_set_primary': {
      $id = (int)($_GET['id'] ?? 0);
      if ($id <= 0) fail("id manquant.", 400);

      $stmt = $db->prepare("SELECT plan_id FROM plan_images WHERE id = ?");
      $stmt->execute([$id]);
      $row = $stmt->fetch();
      if (!$row) fail("Image introuvable.", 404);

      $planId = (int)$row['plan_id'];
      $db->prepare("UPDATE plan_images SET is_primary = 0 WHERE plan_id = ?")->execute([$planId]);
      $db->prepare("UPDATE plan_images SET is_primary = 1 WHERE id = ?")->execute([$id]);

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
