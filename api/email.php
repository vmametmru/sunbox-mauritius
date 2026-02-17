<?php
/**
 * SUNBOX MAURITIUS - Email API Endpoint
 *
 * Upload to: public_html/api/email.php
 *
 * Requires PHPMailer - install via Composer:
 * composer require phpmailer/phpmailer
 */

require_once __DIR__ . '/config.php';

/**
 * Load Composer autoload - try multiple common paths
 * Supports various hosting configurations (a2hosting, cPanel, etc.)
 */
$autoloadPaths = [
    dirname(__DIR__) . '/vendor/autoload.php',           // public_html/vendor/autoload.php
    __DIR__ . '/vendor/autoload.php',                    // public_html/api/vendor/autoload.php
    dirname(__DIR__, 2) . '/vendor/autoload.php',        // One level above public_html
    '/home/' . get_current_user() . '/vendor/autoload.php', // User home directory
];

foreach ($autoloadPaths as $autoloadPath) {
    if (file_exists($autoloadPath)) {
        require_once $autoloadPath;
        break;
    }
}

require_once __DIR__ . '/email_helpers.php';

// Handle CORS
handleCORS();

// Get request body
$body = getRequestBody();

// Get action
$action = $_GET['action'] ?? 'send';

try {
    $db = getDB();

    // Load SMTP settings from database (email group)
    $stmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_group = 'email'");
    $emailSettings = [];
    while ($row = $stmt->fetch()) {
        $emailSettings[$row['setting_key']] = $row['setting_value'];
    }

    // Normalize & secure: complete missing settings from .env (server only)
    $emailSettings = normalizeEmailSettings($emailSettings);

    switch ($action) {
        case 'send':
            validateRequired($body, ['to', 'subject']);

            if (empty($emailSettings['smtp_host']) || empty($emailSettings['smtp_user'])) {
                errorResponse('Email not configured. Please configure SMTP settings in admin panel.');
            }
            if (empty($emailSettings['smtp_password'])) {
                errorResponse('SMTP password missing. Please set SMTP_PASS in .env on the server.');
            }

            $result = sendEmail($emailSettings, $body);

            // Log the email
            logEmail($db, $body, $result ? 'sent' : 'failed');

            if ($result) {
                successResponse(null, 'Email sent successfully');
            } else {
                errorResponse('Failed to send email');
            }
            break;

        case 'send_template':
            validateRequired($body, ['to', 'template_key', 'data']);

            // Get template
            $stmt = $db->prepare("SELECT * FROM email_templates WHERE template_key = ? AND is_active = 1");
            $stmt->execute([$body['template_key']]);
            $template = $stmt->fetch();

            if (!$template) {
                errorResponse('Email template not found: ' . $body['template_key']);
            }

            // Replace variables in template
            $subject  = replaceVariables($template['subject'], $body['data']);
            $htmlBody = replaceVariables($template['body_html'], $body['data']);
            $textBody = replaceVariables($template['body_text'] ?? '', $body['data']);

            $emailData = [
                'to'      => $body['to'],
                'subject' => $subject,
                'html'    => $htmlBody,
                'text'    => $textBody
            ];

            if (isset($body['cc'])) {
                $emailData['cc'] = $body['cc'];
            }

            if (empty($emailSettings['smtp_password'])) {
                errorResponse('SMTP password missing. Please set SMTP_PASS in .env on the server.');
            }

            $result = sendEmail($emailSettings, $emailData);

            // Log the email
            logEmail($db, $emailData, $result ? 'sent' : 'failed', $body['template_key']);

            if ($result) {
                successResponse(null, 'Email sent successfully');
            } else {
                errorResponse('Failed to send email');
            }
            break;

        case 'test':
            validateRequired($body, ['to']);

            if (empty($emailSettings['smtp_host']) || empty($emailSettings['smtp_user'])) {
                errorResponse('Email not configured. Please configure SMTP settings first.');
            }
            if (empty($emailSettings['smtp_password'])) {
                errorResponse('SMTP password missing. Please set SMTP_PASS in .env on the server.');
            }

            $testEmail = [
                'to' => $body['to'],
                'subject' => 'Test Email - Sunbox Mauritius',
                'html' => '
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: white; margin: 0;">Sunbox Mauritius</h1>
                        </div>
                        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                            <h2 style="color: #1f2937;">Test Email</h2>
                            <p>Si vous recevez cet email, votre configuration SMTP fonctionne correctement.</p>
                            <p style="color: #6b7280; margin-top: 20px;">
                                <strong>Configuration:</strong><br>
                                Serveur: ' . htmlspecialchars($emailSettings['smtp_host']) . '<br>
                                Port: ' . htmlspecialchars((string)$emailSettings['smtp_port']) . '<br>
                                Sécurité: ' . htmlspecialchars($emailSettings['smtp_secure'] ?? 'tls') . '
                            </p>
                            <p style="margin-top: 30px; color: #9ca3af; font-size: 12px;">
                                Email envoyé le ' . date('d/m/Y à H:i:s') . '
                            </p>
                        </div>
                    </div>
                ',
                'text' => "Test Email - Sunbox Mauritius\n\nSi vous recevez cet email, votre configuration SMTP fonctionne correctement."
            ];

            $result = sendEmail($emailSettings, $testEmail);

            if ($result) {
                successResponse(null, 'Test email sent successfully to ' . $body['to']);
            } else {
                errorResponse('Failed to send test email. Please check your SMTP settings.');
            }
            break;

        case 'get_logs':
            requireAdmin();
            $limit = (int)($body['limit'] ?? 50);
            if ($limit < 1) $limit = 50;
            if ($limit > 500) $limit = 500;

            // Safer than binding LIMIT for some MySQL configs
            $stmt = $db->query("SELECT * FROM email_logs ORDER BY created_at DESC LIMIT " . $limit);
            successResponse($stmt->fetchAll());
            break;

        default:
            errorResponse('Invalid action');
    }

} catch (Exception $e) {
    errorResponse($e->getMessage());
}
}
