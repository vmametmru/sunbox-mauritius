<?php
/**
 * SUNBOX MAURITIUS - Database Configuration
 * Host: A2hosting.com
 * 
 * IMPORTANT: Upload this file to your A2hosting server
 * Place in: public_html/api/config.php
 */

// Database credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'mauriti2_sunbox_mauritius');
define('DB_USER', 'mauriti2_vmamet');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// CORS settings - Update with your actual domain
define('ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://sunbox-mauritius.com',
    'https://www.sunbox-mauritius.com',
    'https://famous.ai',
    // Add your actual domain here
]);

// API settings
define('API_DEBUG', false); // Set to false in production

// Email settings (will be loaded from database)
$SMTP_CONFIG = [
    'host' => 'mail.sunbox-mauritius.com',
    'port' => 465,
    'username' => 'info@sunbox-mauritius.com',
    'password' => '',
    'secure' => 'ssl',
    'from_email' => 'info@sunbox-mauritius.com',
    'from_name' => 'Sunbox Ltd'
];

// Create PDO connection
function getDB() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            if (API_DEBUG) {
                throw new Exception("Database connection failed: " . $e->getMessage());
            } else {
                throw new Exception("Database connection failed");
            }
        }
    }
    
    return $pdo;
}

// Handle CORS
function handleCORS() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Check if origin is allowed
    if (in_array($origin, ALLOWED_ORIGINS) || API_DEBUG) {
        header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
    } else {
        header("Access-Control-Allow-Origin: *");
    }
    
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    header("Content-Type: application/json; charset=UTF-8");
    
    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// JSON response helper
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

// Error response helper
function errorResponse($message, $statusCode = 400) {
    jsonResponse(['error' => $message, 'success' => false], $statusCode);
}

// Success response helper
function successResponse($data = null, $message = 'Success') {
    $response = ['success' => true, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    jsonResponse($response);
}

// Get request body as JSON
function getRequestBody() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

// Validate required fields
function validateRequired($data, $fields) {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            $missing[] = $field;
        }
    }
    if (!empty($missing)) {
        errorResponse("Missing required fields: " . implode(', ', $missing));
    }
}

// Sanitize input
function sanitize($value) {
    if (is_string($value)) {
        return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
    }
    return $value;
}

// Generate quote reference number
function generateQuoteReference() {
    $date = date('Ymd');
    $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 4));
    return "SBX-{$date}-{$random}";
}
