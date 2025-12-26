<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

handleCORS();
startSession();
requireAdmin();

function fail(string $msg, int $code = 400): void { errorResponse($msg, $code); }
function ok(array $data = []): void { successResponse($data); }

$db = getDB();
$action = $_GET['action'] ?? '';

$MAX_BYTES = 6 * 1024 * 1024; // 6MB
$ALLOWED_MIME = [
  'image/jpeg' => 'jpg',
  'image/png'  => 'png',
  'image/webp' => 'webp',
];

function getPublicUrl(string $relativePath): string {
  return '/' . ltrim($relativePath, '/');
}

function safeRandomName(string $ext): string {
  return bin2hex(random_bytes(16)) . '.' . $ext;
}

/**
 * accepte un upload en multipart:
 * - field name: "file" OU "image"
 */
function uploadOne(string $folder, array $allowedMime, int $maxBytes): array {
  $fileKey = null;
  if (!empty($_FILES['file']['tmp_name']))  $fileKey = 'file';
  if (!empty($_FILES['image']['tmp_name'])) $fileKey = 'image';
  if ($fileKey === null) {
    fail("Fichier manquant (field name = file ou image).", 400);
  }

  $f = $_FILES[$fileKey];

  if (!empty($f['error'])) {
    fail("Erreur upload: " . (string)$f['error'], 400);
  }

  if (($f['size'] ?? 0) <= 0 || $f['size'] > $maxBytes) {
    fail("Taille invalide (max " . (int)($maxBytes/1024/1024) . "MB).", 400);
  }

  $tmp = $f['tmp_name'];

  $mime = '';
  if (function_exists('finfo_open')) {
    $fi = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($fi, $tmp) ?: '';
    finfo_close($fi);
  } elseif (function_exists('mime_content_type')) {
    $mime = mime_content_type($tmp) ?: '';
  }

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
  $absPath = dirname(__DIR__) . '/' . $relPath;

  if (!move_uploaded_file($tmp, $absPath)) {
    fail("Impossible d'enregistrer le fichier.", 500);
  }

  @chmod($absPath, 0644);

  return [
    'file' => $relPath,
    'url'  => getPublicUrl($relPath),
    'mime' => $mime,
    'size' => (int)$f['size'],
  ];
}

function normType(string $t): string {
  $t = strtolower(trim($t));
  return ($t === 'plan') ? 'plan' : 'model';
}

function tableForType(string $type): array {
  if ($type === 'plan') return ['table' => 'plan_images',  'refcol' => 'plan_id',  'folder' => 'uploads/plans',  'primary' => 'is_primary'];
  return               ['table' => 'model_images', 'refcol' => 'model_id', 'folder' => 'uploads/models', 'primary' => 'is_primary'];
}

try {
  // Aliases (compat avec l’ancien code)
  if ($action === 'model_list')        { $_GET['type'] = 'model'; $action = 'list';  }
  if ($action === 'plan_list')         { $_GET['type'] = 'plan';  $action = 'list';  }
  if ($action === 'model_upload')      { $_GET['type'] = 'model'; $action = 'upload'; }
  if ($action === 'plan_upload')       { $_GET['type'] = 'plan';  $action = 'upload'; }
  if ($action === 'model_delete')      { $_GET['type'] = 'model'; $action = 'delete'; }
  if ($action === 'plan_delete')       { $_GET['type'] = 'plan';  $action = 'delete'; }
  if ($action === 'model_set_primary') { $_GET['type'] = 'model'; $action = 'set_primary'; }
  if ($action === 'plan_set_primary')  { $_GET['type'] = 'plan';  $action = 'set_primary'; }

  switch ($action) {

    /**
     * GET /api/media.php?action=list&type=model&ref_id=12
     * GET /api/media.php?action=list&type=plan&ref_id=7
     * (si ref_id absent → retourne une liste “mixte” limitée)
     */
    case 'list': {
      $type = normType((string)($_GET['type'] ?? 'model'));
      $refId = (int)($_GET['ref_id'] ?? ($_GET['model_id'] ?? ($_GET['plan_id'] ?? 0)));

      if ($refId > 0) {
        $meta = tableForType($type);
        $stmt = $db->prepare("
          SELECT id, {$meta['refcol']} AS ref_id, file_path AS file, {$meta['primary']} AS is_main, created_at
          FROM {$meta['table']}
          WHERE {$meta['refcol']} = ?
          ORDER BY {$meta['primary']} DESC, sort_order ASC, id DESC
        ");
        $stmt->execute([$refId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) $r['url'] = getPublicUrl((string)$r['file']);
        ok(['items' => $rows]);
      }

      // Sans ref_id : liste mixte (limite)
      $limit = 200;
      $q = "
        (SELECT 'model' AS type, id, model_id AS ref_id, file_path AS file, is_primary AS is_main, created_at FROM model_images ORDER BY id DESC LIMIT $limit)
        UNION ALL
        (SELECT 'plan'  AS type, id, plan_id  AS ref_id, file_path AS file, is_primary AS is_main, created_at FROM plan_images  ORDER BY id DESC LIMIT $limit)
      ";
      $rows = $db->query($q)->fetchAll();
      foreach ($rows as &$r) $r['url'] = getPublicUrl((string)$r['file']);
      ok(['items' => $rows]);
      break;
    }

    /**
     * POST multipart:
     * - type=model|plan
     * - ref_id=12
     * - file OR image
     */
    case 'upload': {
      $type  = normType((string)($_POST['type'] ?? ($_GET['type'] ?? 'model')));
      $refId = (int)($_POST['ref_id'] ?? ($_GET['ref_id'] ?? ($_GET['model_id'] ?? ($_GET['plan_id'] ?? 0))));
      if ($refId <= 0) fail("ref_id manquant.", 400);

      $meta = tableForType($type);
      $up = uploadOne($meta['folder'], $ALLOWED_MIME, $MAX_BYTES);

      $stmt = $db->prepare("INSERT INTO {$meta['table']} ({$meta['refcol']}, file_path) VALUES (?, ?)");
      $stmt->execute([$refId, $up['file']]);

      ok(['file' => $up]);
      break;
    }

    /**
     * POST JSON:
     * { "type":"model", "id":123 }
     */
    case 'delete': {
      $body = getRequestBody();
      $type = normType((string)($body['type'] ?? ($_GET['type'] ?? 'model')));
      $id   = (int)($body['id'] ?? ($_GET['id'] ?? 0));
      if ($id <= 0) fail("id manquant.", 400);

      $meta = tableForType($type);

      $stmt = $db->prepare("SELECT file_path FROM {$meta['table']} WHERE id = ?");
      $stmt->execute([$id]);
      $row = $stmt->fetch();
      if (!$row) fail("Image introuvable.", 404);

      $db->prepare("DELETE FROM {$meta['table']} WHERE id = ?")->execute([$id]);

      $abs = dirname(__DIR__) . '/' . ltrim((string)$row['file_path'], '/');
      if (is_file($abs)) @unlink($abs);

      ok(['deleted' => true]);
      break;
    }

    /**
     * POST JSON:
     * { "type":"model", "id":123 }
     */
    case 'set_primary': {
      $body = getRequestBody();
      $type = normType((string)($body['type'] ?? ($_GET['type'] ?? 'model')));
      $id   = (int)($body['id'] ?? ($_GET['id'] ?? 0));
      if ($id <= 0) fail("id manquant.", 400);

      $meta = tableForType($type);

      $stmt = $db->prepare("SELECT {$meta['refcol']} AS ref_id FROM {$meta['table']} WHERE id = ?");
      $stmt->execute([$id]);
      $row = $stmt->fetch();
      if (!$row) fail("Image introuvable.", 404);

      $refId = (int)$row['ref_id'];
      $db->prepare("UPDATE {$meta['table']} SET {$meta['primary']} = 0 WHERE {$meta['refcol']} = ?")->execute([$refId]);
      $db->prepare("UPDATE {$meta['table']} SET {$meta['primary']} = 1 WHERE id = ?")->execute([$id]);

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
