<?php
require_once 'config.php';
handleCORS();

try {
    $db = getDB();

    $stmt = $db->prepare("
        SELECT filename, alt_text 
        FROM model_images 
        WHERE media_type = 'photo' 
          AND JSON_CONTAINS(tags, '\"bandeau\"') = 1 
          AND is_primary = 0
        ORDER BY sort_order ASC, id DESC
    ");
    $stmt->execute();
    $images = $stmt->fetchAll();

    $result = array_map(function($img) {
        return [
            'url' => '/uploads/' . $img['filename'],
            'alt' => $img['alt_text'] ?? ''
        ];
    }, $images);

    echo json_encode([
        'success' => true,
        'images' => $result
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => API_DEBUG ? $e->getMessage() : 'Erreur serveur'
    ]);
}
