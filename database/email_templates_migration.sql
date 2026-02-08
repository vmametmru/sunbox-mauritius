-- ============================================
-- SUNBOX MAURITIUS - Email Templates Migration
-- ============================================
-- This migration creates the email_templates and email_logs tables
-- with support for template_type (quote, notification, password_reset, etc.)
-- ============================================

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS email_templates;

-- ============================================
-- TABLE: email_templates (Email templates with type support)
-- ============================================
CREATE TABLE email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    template_type ENUM('quote', 'notification', 'password_reset', 'contact', 'status_change', 'other') NOT NULL DEFAULT 'other',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (template_key),
    INDEX idx_type (template_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: email_logs (Email sending history)
-- ============================================
CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    template_key VARCHAR(100),
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    error_message TEXT,
    sent_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recipient (recipient_email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_template_key (template_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Default Email Templates
-- ============================================
INSERT INTO email_templates (template_key, template_type, name, description, subject, body_html, body_text, variables) VALUES
-- Quote confirmation template
('quote_confirmation', 'quote', 'Confirmation de devis', 'Email envoyé au client après création d\'un devis', 'Votre devis Sunbox Mauritius - {{reference}}', 
'<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
<h1 style="color: white; margin: 0;">Sunbox Mauritius</h1>
</div>
<div style="padding: 30px; background: #f9fafb;">
<h2 style="color: #1f2937;">Bonjour {{customer_name}},</h2>
<p>Merci pour votre demande de devis. Voici le récapitulatif :</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
<p><strong>Référence :</strong> {{reference}}</p>
<p><strong>Modèle :</strong> {{model_name}}</p>
<p><strong>Prix de base :</strong> Rs {{base_price}}</p>
<p><strong>Options :</strong> Rs {{options_total}}</p>
<hr style="border: none; border-top: 2px solid #f97316; margin: 15px 0;">
<p style="font-size: 18px;"><strong>Total :</strong> Rs {{total_price}}</p>
</div>
<p>Ce devis est valable jusqu''au {{valid_until}}.</p>
<p>Notre équipe vous contactera dans les plus brefs délais.</p>
<p style="margin-top: 30px;">Cordialement,<br><strong>L''équipe Sunbox Mauritius</strong></p>
</div>
<div style="background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
<p>Sunbox Mauritius - Grand Baie, Mauritius</p>
<p>Tel: +230 5250 1234 | Email: info@sunbox-mauritius.com</p>
</div>
</body>
</html>',
'Bonjour {{customer_name}},\n\nMerci pour votre demande de devis.\n\nRéférence: {{reference}}\nModèle: {{model_name}}\nTotal: Rs {{total_price}}\n\nCe devis est valable jusqu''au {{valid_until}}.\n\nCordialement,\nL''équipe Sunbox Mauritius',
'["customer_name", "reference", "model_name", "base_price", "options_total", "total_price", "valid_until"]'),

-- Admin notification template
('quote_admin_notification', 'notification', 'Notification admin nouveau devis', 'Email envoyé à l\'admin lors d\'un nouveau devis', 'Nouveau devis reçu - {{reference}}',
'<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #1f2937; padding: 20px; text-align: center;">
<h1 style="color: #f97316; margin: 0;">Nouveau Devis</h1>
</div>
<div style="padding: 30px; background: #f9fafb;">
<h2 style="color: #1f2937;">Référence: {{reference}}</h2>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3>Client</h3>
<p><strong>Nom :</strong> {{customer_name}}</p>
<p><strong>Email :</strong> {{customer_email}}</p>
<p><strong>Téléphone :</strong> {{customer_phone}}</p>
<p><strong>Adresse :</strong> {{customer_address}}</p>
<h3>Devis</h3>
<p><strong>Modèle :</strong> {{model_name}} ({{model_type}})</p>
<p><strong>Prix de base :</strong> Rs {{base_price}}</p>
<p><strong>Options :</strong> Rs {{options_total}}</p>
<p style="font-size: 18px; color: #f97316;"><strong>Total : Rs {{total_price}}</strong></p>
</div>
<p><strong>Message du client :</strong></p>
<p style="background: white; padding: 15px; border-radius: 8px;">{{customer_message}}</p>
<p style="margin-top: 20px;">
<a href="{{admin_url}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir dans l''admin</a>
</p>
</div>
</body>
</html>',
'Nouveau devis reçu\n\nRéférence: {{reference}}\nClient: {{customer_name}}\nEmail: {{customer_email}}\nTéléphone: {{customer_phone}}\nModèle: {{model_name}}\nTotal: Rs {{total_price}}\n\nMessage: {{customer_message}}',
'["reference", "customer_name", "customer_email", "customer_phone", "customer_address", "model_name", "model_type", "base_price", "options_total", "total_price", "customer_message", "admin_url"]'),

-- Quote approved template (status change)
('quote_approved', 'status_change', 'Devis approuvé', 'Email envoyé au client lorsque son devis est approuvé', 'Votre devis {{reference}} a été approuvé',
'<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
<h1 style="color: white; margin: 0;">Devis Approuvé</h1>
</div>
<div style="padding: 30px; background: #f9fafb;">
<h2 style="color: #1f2937;">Bonjour {{customer_name}},</h2>
<p>Excellente nouvelle ! Votre devis <strong>{{reference}}</strong> a été approuvé.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
<p><strong>Modèle :</strong> {{model_name}}</p>
<p style="font-size: 20px; color: #22c55e;"><strong>Total : Rs {{total_price}}</strong></p>
</div>
<p>Notre équipe commerciale vous contactera très prochainement pour finaliser votre commande.</p>
<p style="margin-top: 30px;">Cordialement,<br><strong>L''équipe Sunbox Mauritius</strong></p>
</div>
</body>
</html>',
'Bonjour {{customer_name}},\n\nVotre devis {{reference}} a été approuvé.\nModèle: {{model_name}}\nTotal: Rs {{total_price}}\n\nNotre équipe vous contactera prochainement.\n\nCordialement,\nL''équipe Sunbox Mauritius',
'["customer_name", "reference", "model_name", "total_price"]'),

-- Quote rejected template (status change)
('quote_rejected', 'status_change', 'Devis refusé', 'Email envoyé au client lorsque son devis est refusé', 'Concernant votre devis {{reference}}',
'<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
<h1 style="color: white; margin: 0;">Information Devis</h1>
</div>
<div style="padding: 30px; background: #f9fafb;">
<h2 style="color: #1f2937;">Bonjour {{customer_name}},</h2>
<p>Nous vous informons que votre devis <strong>{{reference}}</strong> n''a malheureusement pas pu être validé.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
<p><strong>Modèle :</strong> {{model_name}}</p>
<p><strong>Raison :</strong> {{rejection_reason}}</p>
</div>
<p>N''hésitez pas à nous contacter pour plus d''informations ou pour discuter d''autres options.</p>
<p style="margin-top: 30px;">Cordialement,<br><strong>L''équipe Sunbox Mauritius</strong></p>
</div>
</body>
</html>',
'Bonjour {{customer_name}},\n\nVotre devis {{reference}} n''a pas pu être validé.\nModèle: {{model_name}}\nRaison: {{rejection_reason}}\n\nN''hésitez pas à nous contacter.\n\nCordialement,\nL''équipe Sunbox Mauritius',
'["customer_name", "reference", "model_name", "rejection_reason"]'),

-- Contact confirmation template
('contact_confirmation', 'contact', 'Confirmation de contact', 'Email envoyé après soumission du formulaire de contact', 'Nous avons bien reçu votre message',
'<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
<h1 style="color: white; margin: 0;">Sunbox Mauritius</h1>
</div>
<div style="padding: 30px; background: #f9fafb;">
<h2 style="color: #1f2937;">Bonjour {{name}},</h2>
<p>Nous avons bien reçu votre message et nous vous en remercions.</p>
<p>Notre équipe vous répondra dans les plus brefs délais.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
<p><strong>Votre message :</strong></p>
<p style="color: #6b7280;">{{message}}</p>
</div>
<p style="margin-top: 30px;">Cordialement,<br><strong>L''équipe Sunbox Mauritius</strong></p>
</div>
</body>
</html>',
'Bonjour {{name}},\n\nNous avons bien reçu votre message et nous vous en remercions.\n\nCordialement,\nL''équipe Sunbox Mauritius',
'["name", "message"]'),

-- Password reset template
('password_reset', 'password_reset', 'Réinitialisation de mot de passe', 'Email envoyé pour réinitialiser le mot de passe', 'Réinitialisation de votre mot de passe - Sunbox Mauritius',
'<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
<h1 style="color: white; margin: 0;">Sunbox Mauritius</h1>
</div>
<div style="padding: 30px; background: #f9fafb;">
<h2 style="color: #1f2937;">Bonjour {{name}},</h2>
<p>Vous avez demandé à réinitialiser votre mot de passe.</p>
<p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
<div style="text-align: center; margin: 30px 0;">
<a href="{{reset_link}}" style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Réinitialiser mon mot de passe</a>
</div>
<p style="color: #6b7280; font-size: 14px;">Ce lien est valable pendant 1 heure.</p>
<p style="color: #6b7280; font-size: 14px;">Si vous n''avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
<p style="margin-top: 30px;">Cordialement,<br><strong>L''équipe Sunbox Mauritius</strong></p>
</div>
</body>
</html>',
'Bonjour {{name}},\n\nVous avez demandé à réinitialiser votre mot de passe.\n\nCliquez sur ce lien pour créer un nouveau mot de passe : {{reset_link}}\n\nCe lien est valable pendant 1 heure.\n\nSi vous n''avez pas demandé cette réinitialisation, ignorez simplement cet email.\n\nCordialement,\nL''équipe Sunbox Mauritius',
'["name", "reset_link"]');

-- ============================================
-- END OF MIGRATION
-- ============================================

SELECT 'Email templates migration completed successfully!' AS Status;
SELECT COUNT(*) AS 'Email Templates Created' FROM email_templates;
