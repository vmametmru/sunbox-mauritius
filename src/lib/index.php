<?php
require_once "lib/db.php";
require_once "lib/utils.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $_POST['action'] ?? null;

if (!$action) fail("Invalid action");

switch ($action) {
  case 'auth_login':
    require_once "actions/auth_login.php";
    break;

  case 'get_models':
  case 'create_model':
  case 'update_model':
  case 'delete_model':
    require_once "actions/models.php";
    break;

  case 'get_options':
  case 'get_option_categories':
  case 'create_option':
  case 'update_option':
  case 'delete_option':
    require_once "actions/options.php";
    break;

  case 'get_settings':
  case 'update_setting':
  case 'update_settings_bulk':
    require_once "actions/settings.php";
    break;

  case 'get_quotes':
  case 'get_quote':
  case 'create_quote':
  case 'update_quote_status':
  case 'delete_quote':
    require_once "actions/quotes.php";
    break;

  case 'get_contacts':
  case 'create_contact':
  case 'update_contact_status':
    require_once "actions/contacts.php";
    break;

  case 'get_email_templates':
  case 'update_email_template':
    require_once "actions/emails.php";
    break;

  case 'get_activity_logs':
    require_once "actions/activity_logs.php";
    break;

  default:
    fail("Invalid action");
}
