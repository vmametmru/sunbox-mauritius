-- ============================================
-- SUNBOX MAURITIUS - Email Signatures Migration
-- ============================================
-- This migration creates the email_signatures table
-- for storing email signature templates with logo and photo support
-- ============================================

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS email_signatures;

-- ============================================
-- TABLE: email_signatures (Email signature templates)
-- ============================================
CREATE TABLE email_signatures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    signature_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    body_html TEXT NOT NULL,
    logo_url VARCHAR(500),
    photo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (signature_key),
    INDEX idx_active (is_active),
    INDEX idx_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Default Email Signature
-- ============================================
INSERT INTO email_signatures (signature_key, name, description, body_html, is_active, is_default) VALUES
('default_signature', 'Signature par défaut', 'Signature standard de l''entreprise',
'<table style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  <tr>
    <td style="padding-right: 15px; vertical-align: top;">
      {{signature_photo}}
    </td>
    <td style="border-left: 3px solid #f97316; padding-left: 15px;">
      <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 16px; color: #1f2937;">{{sender_name}}</p>
      <p style="margin: 0 0 5px 0; color: #6b7280;">{{sender_title}}</p>
      <p style="margin: 0 0 10px 0;">
        {{signature_logo}}
      </p>
      <p style="margin: 0 0 3px 0; font-weight: bold; color: #f97316;">Sunbox Mauritius</p>
      <p style="margin: 0 0 3px 0; font-size: 12px;">📍 Grand Baie, Mauritius</p>
      <p style="margin: 0 0 3px 0; font-size: 12px;">📞 +230 52544544 / +230 54221025</p>
      <p style="margin: 0 0 3px 0; font-size: 12px;">✉️ info@sunbox-mauritius.com</p>
      <p style="margin: 0; font-size: 12px;">🌐 www.sunbox-mauritius.com</p>
    </td>
  </tr>
</table>',
TRUE, TRUE);

-- ============================================
-- END OF MIGRATION
-- ============================================

SELECT 'Email signatures migration completed successfully!' AS Status;
SELECT COUNT(*) AS 'Email Signatures Created' FROM email_signatures;
