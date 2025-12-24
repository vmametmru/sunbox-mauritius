<?php
/**
 * SUNBOX MAURITIUS - Email API Endpoint
 * 
 * Upload to: public_html/api/email.php
 * 
 * Requires PHPMailer - install via Composer or download manually
 * composer require phpmailer/phpmailer
 */

require_once 'config.php';

// If using Composer
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// Handle CORS
handleCORS();

// Get request body
$body = getRequestBody();

// Get action
$action = $_GET['action'] ?? 'send';

try {
    $db = getDB();
    
    // Load SMTP settings from database
    $stmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_group = 'email'");
    $emailSettings = [];
    while ($row = $stmt->fetch()) {
        $emailSettings[$row['setting_key']] = $row['setting_value'];
    }
    
    switch ($action) {
        case 'send':
            validateRequired($body, ['to', 'subject']);
            
            // Check if we have SMTP configured
            if (empty($emailSettings['smtp_host']) || empty($emailSettings['smtp_user'])) {
                errorResponse('Email not configured. Please configure SMTP settings in admin panel.');
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
            $subject = replaceVariables($template['subject'], $body['data']);
            $htmlBody = replaceVariables($template['body_html'], $body['data']);
            $textBody = replaceVariables($template['body_text'] ?? '', $body['data']);
            
            $emailData = [
                'to' => $body['to'],
                'subject' => $subject,
                'html' => $htmlBody,
                'text' => $textBody
            ];
            
            if (isset($body['cc'])) {
                $emailData['cc'] = $body['cc'];
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
                                Port: ' . htmlspecialchars($emailSettings['smtp_port']) . '<br>
                                Sécurité: ' . htmlspecialchars($emailSettings['smtp_secure'] ?? 'tls') . '
                            </p>
                            <p style="margin-top: 30px; color: #9ca3af; font-size: 12px;">
                                Email envoyé le ' . date('d/m/Y à H:i:s') . '
                            </p>
                        </div>
                    </div>
                ',
                'text' => 'Test Email - Sunbox Mauritius\n\nSi vous recevez cet email, votre configuration SMTP fonctionne correctement.'
            ];
            
            $result = sendEmail($emailSettings, $testEmail);
            
            if ($result) {
                successResponse(null, 'Test email sent successfully to ' . $body['to']);
            } else {
                errorResponse('Failed to send test email. Please check your SMTP settings.');
            }
            break;
            
        case 'get_logs':
            $limit = (int)($body['limit'] ?? 50);
            
            $stmt = $db->prepare("SELECT * FROM email_logs ORDER BY created_at DESC LIMIT ?");
            $stmt->execute([$limit]);
            successResponse($stmt->fetchAll());
            break;
            
        default:
            errorResponse('Invalid action');
    }
    
} catch (Exception $e) {
    errorResponse($e->getMessage());
}

/**
 * Send email using PHPMailer or native mail()
 */
function sendEmail($settings, $data) {
    // Try PHPMailer first
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        return sendWithPHPMailer($settings, $data);
    }
    
    // Fallback to native mail() with SMTP
    return sendWithNativeMail($settings, $data);
}

/**
 * Send email using PHPMailer
 */
function sendWithPHPMailer($settings, $data) {
    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        
        // Server settings
        $mail->isSMTP();
        $mail->Host = $settings['smtp_host'];
        $mail->Port = (int)($settings['smtp_port'] ?? 587);
        $mail->SMTPAuth = true;
        $mail->Username = $settings['smtp_user'];
        $mail->Password = $settings['smtp_password'];
        
        // Security
        $secure = $settings['smtp_secure'] ?? 'tls';
        if ($secure === 'tls') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        } elseif ($secure === 'ssl') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        }
        
        // Encoding
        $mail->CharSet = 'UTF-8';
        
        // From
        $fromEmail = $settings['smtp_from_email'] ?? $settings['smtp_user'];
        $fromName = $settings['smtp_from_name'] ?? 'Sunbox Mauritius';
        $mail->setFrom($fromEmail, $fromName);
        
        // To
        $recipients = is_array($data['to']) ? $data['to'] : [$data['to']];
        foreach ($recipients as $to) {
            $mail->addAddress($to);
        }
        
        // CC
        if (!empty($data['cc'])) {
            $ccList = is_array($data['cc']) ? $data['cc'] : explode(',', $data['cc']);
            foreach ($ccList as $cc) {
                $cc = trim($cc);
                if ($cc) {
                    $mail->addCC($cc);
                }
            }
        }
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = $data['subject'];
        $mail->Body = $data['html'] ?? $data['body'] ?? '';
        $mail->AltBody = $data['text'] ?? strip_tags($mail->Body);
        
        return $mail->send();
        
    } catch (Exception $e) {
        error_log('PHPMailer Error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Send email using native mail() function
 * Note: This requires proper server configuration
 */
function sendWithNativeMail($settings, $data) {
    $to = is_array($data['to']) ? implode(', ', $data['to']) : $data['to'];
    $subject = $data['subject'];
    
    $fromEmail = $settings['smtp_from_email'] ?? $settings['smtp_user'] ?? 'noreply@sunbox-mauritius.com';
    $fromName = $settings['smtp_from_name'] ?? 'Sunbox Mauritius';
    
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . $fromName . ' <' . $fromEmail . '>',
        'Reply-To: ' . $fromEmail,
        'X-Mailer: PHP/' . phpversion()
    ];
    
    if (!empty($data['cc'])) {
        $cc = is_array($data['cc']) ? implode(', ', $data['cc']) : $data['cc'];
        $headers[] = 'Cc: ' . $cc;
    }
    
    $body = $data['html'] ?? $data['body'] ?? '';
    
    return mail($to, $subject, $body, implode("\r\n", $headers));
}

/**
 * Replace template variables
 */
function replaceVariables($template, $data) {
    foreach ($data as $key => $value) {
        $template = str_replace('{{' . $key . '}}', $value, $template);
    }
    return $template;
}

/**
 * Log email to database
 */
function logEmail($db, $data, $status, $templateKey = null) {
    try {
        $stmt = $db->prepare("
            INSERT INTO email_logs (recipient_email, recipient_name, subject, template_key, status, sent_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $to = is_array($data['to']) ? implode(', ', $data['to']) : $data['to'];
        
        $stmt->execute([
            $to,
            $data['recipient_name'] ?? null,
            $data['subject'],
            $templateKey,
            $status,
            $status === 'sent' ? date('Y-m-d H:i:s') : null
        ]);
    } catch (Exception $e) {
        // Silently fail
    }
}
