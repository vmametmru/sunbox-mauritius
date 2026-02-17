<?php
/**
 * SUNBOX MAURITIUS - Shared Email Helper Functions
 * 
 * Shared email functions used by both index.php and email.php
 */

/**
 * Normalize email settings:
 * - DB values are used when present
 * - .env provides fallback values
 * - SMTP password is ALWAYS preferred from .env when set
 */
function normalizeEmailSettings(array $dbSettings): array
{
    $envHost = (string) env('SMTP_HOST', 'mail.sunbox-mauritius.com');
    $envPort = (string) env('SMTP_PORT', '465');
    $envUser = (string) env('SMTP_USER', 'info@sunbox-mauritius.com');
    $envPass = (string) env('SMTP_PASS', '');
    $envSec  = (string) env('SMTP_SECURE', 'ssl');
    $envFrom = (string) env('SMTP_FROM_EMAIL', $envUser);
    $envName = (string) env('SMTP_FROM_NAME', 'Sunbox Ltd');

    $out = $dbSettings;

    $out['smtp_host'] = $out['smtp_host'] ?? $envHost;
    $out['smtp_port'] = $out['smtp_port'] ?? $envPort;
    $out['smtp_user'] = $out['smtp_user'] ?? $envUser;

    if ($envPass !== '') {
        $out['smtp_password'] = $envPass;
    } else {
        $out['smtp_password'] = $out['smtp_password'] ?? '';
    }

    $out['smtp_secure']     = $out['smtp_secure'] ?? $envSec;
    $out['smtp_from_email'] = $out['smtp_from_email'] ?? $envFrom;
    $out['smtp_from_name']  = $out['smtp_from_name'] ?? $envName;

    return $out;
}

/**
 * Send email - uses PHPMailer if available, falls back to native PHP mail()
 */
function sendEmail($settings, $data)
{
    if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        return sendWithPHPMailer($settings, $data);
    }
    return sendWithNativeMail($settings, $data);
}

/**
 * Send email using PHPMailer
 */
function sendWithPHPMailer($settings, $data)
{
    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);

        $mail->isSMTP();
        $mail->Host       = $settings['smtp_host'];
        $mail->Port       = (int)($settings['smtp_port'] ?? 587);
        $mail->SMTPAuth   = true;
        $mail->Username   = $settings['smtp_user'];
        $mail->Password   = $settings['smtp_password'];

        $secure = $settings['smtp_secure'] ?? 'tls';
        if ($secure === 'tls') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        } elseif ($secure === 'ssl') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        }

        $mail->CharSet = 'UTF-8';

        $fromEmail = $settings['smtp_from_email'] ?? $settings['smtp_user'];
        $fromName  = $settings['smtp_from_name'] ?? 'Sunbox Mauritius';
        $mail->setFrom($fromEmail, $fromName);

        $recipients = is_array($data['to']) ? $data['to'] : [$data['to']];
        foreach ($recipients as $to) {
            $mail->addAddress($to);
        }

        if (!empty($data['cc'])) {
            $ccList = is_array($data['cc']) ? $data['cc'] : explode(',', $data['cc']);
            foreach ($ccList as $cc) {
                $cc = trim($cc);
                if ($cc) {
                    $mail->addCC($cc);
                }
            }
        }

        // Attach files if provided
        if (!empty($data['attachments'])) {
            foreach ($data['attachments'] as $attachment) {
                if (!empty($attachment['path']) && file_exists($attachment['path'])) {
                    $mail->addAttachment($attachment['path'], $attachment['name'] ?? '');
                } elseif (!empty($attachment['content'])) {
                    $mail->addStringAttachment($attachment['content'], $attachment['name'] ?? 'attachment');
                }
            }
        }

        $mail->isHTML(true);
        $mail->Subject = (string)($data['subject'] ?? '');
        $mail->Body    = (string)($data['html'] ?? $data['body'] ?? '');
        $mail->AltBody = (string)($data['text'] ?? strip_tags($mail->Body));

        return $mail->send();

    } catch (Exception $e) {
        error_log('PHPMailer Error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Send email using native PHP mail() function
 */
function sendWithNativeMail($settings, $data)
{
    try {
        $to = is_array($data['to']) ? implode(', ', $data['to']) : $data['to'];
        $subject = (string)($data['subject'] ?? '');
        $htmlBody = (string)($data['html'] ?? $data['body'] ?? '');
        
        $fromEmail = $settings['smtp_from_email'] ?? $settings['smtp_user'] ?? '';
        $fromName = $settings['smtp_from_name'] ?? '';
        
        if (empty($fromEmail)) {
            error_log('Native mail: No from email configured');
            return false;
        }
        
        $headers = [];
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-type: text/html; charset=UTF-8';
        $headers[] = 'From: ' . ($fromName ? $fromName . ' <' . $fromEmail . '>' : $fromEmail);
        $headers[] = 'Reply-To: ' . $fromEmail;
        $headers[] = 'X-Mailer: PHP/' . phpversion();
        
        if (!empty($data['cc'])) {
            $ccList = is_array($data['cc']) ? $data['cc'] : explode(',', $data['cc']);
            $ccList = array_map('trim', $ccList);
            $ccList = array_filter($ccList);
            if (!empty($ccList)) {
                $headers[] = 'Cc: ' . implode(', ', $ccList);
            }
        }
        
        $headerString = implode("\r\n", $headers);
        
        $result = mail($to, $subject, $htmlBody, $headerString);
        
        if (!$result) {
            error_log('Native mail() failed for recipient: ' . $to);
        }
        
        return $result;
        
    } catch (Exception $e) {
        error_log('Native mail Error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Replace template variables
 */
function replaceVariables($template, $data)
{
    foreach ($data as $key => $value) {
        $template = str_replace('{{' . $key . '}}', (string)$value, $template);
    }
    return $template;
}

/**
 * Log email to database
 */
function logEmail($db, $data, $status, $templateKey = null)
{
    try {
        $stmt = $db->prepare("
            INSERT INTO email_logs (recipient_email, recipient_name, subject, template_key, status, sent_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $to = is_array($data['to']) ? implode(', ', $data['to']) : $data['to'];

        $stmt->execute([
            $to,
            $data['recipient_name'] ?? null,
            $data['subject'] ?? '',
            $templateKey,
            $status,
            $status === 'sent' ? date('Y-m-d H:i:s') : null
        ]);
    } catch (Exception $e) {
        // Silently fail
    }
}
