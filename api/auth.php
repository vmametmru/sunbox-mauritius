<?php
require_once __DIR__ . '/config.php';

handleCORS();
startSession(); // doit exister dans config.php

$action = $_GET['action'] ?? 'me';
$body   = getRequestBody();

function ok($data = [], $message = 'OK') { successResponse($data, $message); }
function fail($msg, $code = 401) { errorResponse($msg, $code); }

// Lire le hash admin depuis l'environnement (.env chargé dans config.php)
$adminHash =
    ($_ENV['ADMIN_PASSWORD_HASH'] ?? '') ?:
    (getenv('ADMIN_PASSWORD_HASH') ?: '');

$adminHash = trim((string)$adminHash);
$adminHash = trim($adminHash, "\"'");                 // enlève "..." ou '...'
$adminHash = preg_replace("/\s+/", "", $adminHash);   // enlève espaces/newlines

if (!$adminHash || strlen($adminHash) < 20) {
    fail("ADMIN_PASSWORD_HASH manquant ou invalide côté serveur.", 500);
}

switch ($action) {

    case 'login': {
        validateRequired($body, ['password']);

        // anti brute-force très simple (par session)
        $_SESSION['login_tries'] = $_SESSION['login_tries'] ?? 0;
        if ($_SESSION['login_tries'] >= 10) {
            fail("Trop de tentatives. Réessaie plus tard.", 429);
        }

        $pass = (string)($body['password'] ?? '');
        if (!password_verify($pass, $adminHash)) {
            $_SESSION['login_tries']++;
            fail("Mot de passe incorrect.", 401);
        }

        // OK
        session_regenerate_id(true);
        $_SESSION['is_admin'] = true;
        $_SESSION['admin_login_at'] = time();
        $_SESSION['login_tries'] = 0;

        ok(['is_admin' => true], 'Login OK');
        break;
    }

    case 'logout': {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }

        session_destroy();
        ok(['is_admin' => false], 'Logged out');
        break;
    }

    case 'me':
    default: {
        ok(['is_admin' => !empty($_SESSION['is_admin'])]);
        break;
    }
}
