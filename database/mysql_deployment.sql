-- ============================================
-- SUNBOX MAURITIUS - MySQL Database Deployment
-- ============================================
-- Database: mauriti2_sunbox_mauritius
-- Host: A2hosting.com
-- Compatible with phpMyAdmin
-- ============================================

-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS generate_quote_reference;
DROP PROCEDURE IF EXISTS create_quote;

-- Drop views if they exist
DROP VIEW IF EXISTS v_quotes_details;
DROP VIEW IF EXISTS v_model_stats;

-- Drop tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS quote_options;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS options;
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

-- ============================================
-- TABLE: users (Admin users)
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'sales') DEFAULT 'sales',
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: models (Container homes and pools)
-- ============================================
CREATE TABLE models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('container', 'pool') NOT NULL,
    description TEXT,
    base_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    dimensions VARCHAR(100),
    bedrooms INT DEFAULT 0,
    bathrooms INT DEFAULT 0,
    image_url VARCHAR(500),
    features JSON,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: options (Available options for products)
-- ============================================
CREATE TABLE options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    description TEXT,
    product_type ENUM('container', 'pool', 'both') DEFAULT 'both',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_product_type (product_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: quotes (Customer quote requests)
-- ============================================
CREATE TABLE quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(50) NOT NULL UNIQUE,
    model_id INT NULL,
    model_name VARCHAR(255),
    model_type ENUM('container', 'pool') NOT NULL,
    base_price DECIMAL(12, 2) DEFAULT 0,
    options_total DECIMAL(12, 2) DEFAULT 0,
    total_price DECIMAL(12, 2) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_address TEXT,
    customer_message TEXT,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    valid_until DATE,
    notes TEXT,
    assigned_to INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reference (reference_number),
    INDEX idx_status (status),
    INDEX idx_customer_email (customer_email),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: quote_options (Options selected for each quote)
-- ============================================
CREATE TABLE quote_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    option_id INT NULL,
    option_name VARCHAR(255) NOT NULL,
    option_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quote_id (quote_id),
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: contacts (Contact form submissions)
-- ============================================
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied', 'archived') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: settings (Application settings)
-- ============================================
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_group VARCHAR(50) DEFAULT 'general',
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key),
    INDEX idx_group (setting_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: activity_logs (Audit trail)
-- ============================================
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: email_templates (Email templates)
-- ============================================
CREATE TABLE email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (template_key)
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
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Default Admin User (password: admin123 - CHANGE THIS!)
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@sunbox-mauritius.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrateur', 'admin');

-- Container Models
INSERT INTO models (name, type, description, base_price, dimensions, bedrooms, bathrooms, features, is_active, display_order) VALUES
('Studio 20\'', 'container', 'Studio compact idéal pour un bureau ou un espace de vie minimaliste. Design moderne et fonctionnel.', 850000, '6m x 2.4m', 0, 1, '["Isolation thermique", "Électricité complète", "Climatisation pré-installée", "Fenêtres double vitrage"]', TRUE, 1),
('T1 Standard 20\'', 'container', 'Appartement T1 confortable avec coin cuisine séparé. Parfait pour une personne ou un couple.', 1200000, '6m x 2.4m', 1, 1, '["Cuisine équipée", "Salle de bain complète", "Isolation renforcée", "Terrasse optionnelle"]', TRUE, 2),
('T2 Confort 40\'', 'container', 'Appartement T2 spacieux avec salon séparé. Idéal pour une petite famille.', 1850000, '12m x 2.4m', 2, 1, '["Grande cuisine", "Salon lumineux", "2 chambres", "Rangements intégrés"]', TRUE, 3),
('T3 Family 40\' HC', 'container', 'Maison T3 haute de plafond pour un confort optimal. Espace généreux pour toute la famille.', 2500000, '12m x 2.9m', 3, 2, '["Hauteur sous plafond 2.7m", "2 salles de bain", "Cuisine américaine", "Terrasse couverte"]', TRUE, 4),
('Villa Duplex', 'container', 'Villa sur deux niveaux combinant 2 containers. Le summum du confort container.', 4200000, '12m x 4.8m', 3, 2, '["2 niveaux", "Escalier design", "Rooftop aménageable", "Vue panoramique"]', TRUE, 5),
('Bureau Pro 20\'', 'container', 'Espace de travail professionnel clé en main. Idéal pour startups et freelances.', 950000, '6m x 2.4m', 0, 1, '["Câblage réseau", "Climatisation", "Éclairage LED", "Isolation acoustique"]', TRUE, 6);

-- Pool Models
INSERT INTO models (name, type, description, base_price, dimensions, features, is_active, display_order) VALUES
('Mini Pool 4m', 'pool', 'Piscine compacte idéale pour les petits espaces. Rafraîchissement garanti.', 450000, '4m x 2.5m x 1.2m', '["Structure acier", "Liner premium", "Filtration incluse", "Escalier intégré"]', TRUE, 1),
('Family Pool 6m', 'pool', 'Piscine familiale de taille moyenne. Parfaite pour les baignades en famille.', 750000, '6m x 3m x 1.4m', '["Nage à contre-courant optionnelle", "Éclairage LED", "Plage immergée", "Filtration automatique"]', TRUE, 2),
('Sport Pool 8m', 'pool', 'Grande piscine pour les nageurs. Longueur idéale pour l\'exercice.', 1100000, '8m x 3.5m x 1.5m', '["Couloir de nage", "Nage à contre-courant", "Chauffage solaire", "Couverture automatique"]', TRUE, 3),
('Luxury Pool 10m', 'pool', 'Piscine de luxe avec toutes les options. Pour les espaces généreux.', 1650000, '10m x 4m x 1.6m', '["Design sur mesure", "Cascade décorative", "Spa intégré", "Domotique complète"]', TRUE, 4),
('Plunge Pool', 'pool', 'Bassin de plongée compact et profond. Idéal pour se rafraîchir.', 380000, '3m x 2m x 1.5m', '["Profondeur 1.5m", "Jets massants", "Compact", "Installation rapide"]', TRUE, 5);

-- Options for Containers
INSERT INTO options (name, category, price, description, product_type, is_active, display_order) VALUES
-- Finitions
('Bardage bois extérieur', 'Finitions', 85000, 'Habillage extérieur en bois traité', 'container', TRUE, 1),
('Peinture premium extérieure', 'Finitions', 45000, 'Peinture haute qualité résistante UV', 'container', TRUE, 2),
('Parquet stratifié', 'Finitions', 65000, 'Sol en parquet stratifié haute résistance', 'container', TRUE, 3),
('Carrelage sol complet', 'Finitions', 75000, 'Carrelage céramique pose complète', 'container', TRUE, 4),

-- Électricité
('Panneau solaire 3kW', 'Électricité', 180000, 'Installation solaire avec batteries', 'both', TRUE, 5),
('Panneau solaire 5kW', 'Électricité', 280000, 'Installation solaire grande capacité', 'both', TRUE, 6),
('Éclairage LED complet', 'Électricité', 35000, 'Spots et rubans LED dans toutes les pièces', 'container', TRUE, 7),
('Prises USB intégrées', 'Électricité', 15000, 'Prises avec ports USB dans chaque pièce', 'container', TRUE, 8),

-- Climatisation
('Climatisation split 9000 BTU', 'Climatisation', 55000, 'Clim réversible pour petits espaces', 'container', TRUE, 9),
('Climatisation split 12000 BTU', 'Climatisation', 75000, 'Clim réversible puissance moyenne', 'container', TRUE, 10),
('Climatisation split 18000 BTU', 'Climatisation', 95000, 'Clim réversible grande puissance', 'container', TRUE, 11),

-- Plomberie
('Chauffe-eau solaire 150L', 'Plomberie', 65000, 'Eau chaude solaire économique', 'container', TRUE, 12),
('Chauffe-eau solaire 200L', 'Plomberie', 85000, 'Eau chaude solaire grande capacité', 'container', TRUE, 13),
('Récupération eau de pluie', 'Plomberie', 45000, 'Système de récupération 1000L', 'both', TRUE, 14),

-- Sécurité
('Alarme connectée', 'Sécurité', 55000, 'Système d\'alarme avec app mobile', 'container', TRUE, 15),
('Caméras de surveillance', 'Sécurité', 75000, '4 caméras HD avec enregistrement', 'both', TRUE, 16),
('Porte blindée', 'Sécurité', 95000, 'Porte d\'entrée haute sécurité', 'container', TRUE, 17),

-- Extérieur
('Terrasse bois 15m²', 'Extérieur', 120000, 'Terrasse en bois composite', 'container', TRUE, 18),
('Terrasse bois 25m²', 'Extérieur', 180000, 'Grande terrasse en bois composite', 'container', TRUE, 19),
('Pergola bioclimatique', 'Extérieur', 250000, 'Pergola à lames orientables', 'both', TRUE, 20),
('Aménagement jardin', 'Extérieur', 150000, 'Création espace vert complet', 'both', TRUE, 21);

-- Options for Pools
INSERT INTO options (name, category, price, description, product_type, is_active, display_order) VALUES
('Chauffage piscine solaire', 'Équipements', 95000, 'Panneaux solaires pour chauffer l\'eau', 'pool', TRUE, 22),
('Pompe à chaleur', 'Équipements', 185000, 'Chauffage piscine haute performance', 'pool', TRUE, 23),
('Nage à contre-courant', 'Équipements', 145000, 'Système de nage sportive', 'pool', TRUE, 24),
('Éclairage LED piscine', 'Équipements', 45000, 'Spots LED subaquatiques RGB', 'pool', TRUE, 25),
('Robot nettoyeur', 'Équipements', 85000, 'Robot de nettoyage automatique', 'pool', TRUE, 26),
('Couverture automatique', 'Accessoires', 195000, 'Bâche de sécurité motorisée', 'pool', TRUE, 27),
('Douche solaire', 'Accessoires', 25000, 'Douche extérieure solaire', 'pool', TRUE, 28);

-- Default Settings
INSERT INTO settings (setting_key, setting_value, setting_group, description) VALUES
-- Email Settings
('smtp_host', '', 'email', 'Serveur SMTP'),
('smtp_port', '587', 'email', 'Port SMTP'),
('smtp_user', '', 'email', 'Utilisateur SMTP'),
('smtp_password', '', 'email', 'Mot de passe SMTP'),
('smtp_secure', 'tls', 'email', 'Type de sécurité (tls, ssl, none)'),
('smtp_from_email', '', 'email', 'Adresse email expéditeur'),
('smtp_from_name', 'Sunbox Mauritius', 'email', 'Nom expéditeur'),

-- Company Info
('company_name', 'Sunbox Mauritius', 'company', 'Nom de l\'entreprise'),
('company_email', 'info@sunbox-mauritius.com', 'company', 'Email de contact'),
('company_phone', '+230 5250 1234', 'company', 'Téléphone'),
('company_address', 'Grand Baie, Mauritius', 'company', 'Adresse'),
('company_website', 'https://sunbox-mauritius.com', 'company', 'Site web'),

-- Notifications
('admin_email', '', 'notifications', 'Email administrateur pour notifications'),
('send_admin_notifications', 'true', 'notifications', 'Envoyer notifications admin'),
('send_customer_confirmations', 'true', 'notifications', 'Envoyer confirmations client'),
('cc_emails', '', 'notifications', 'Emails en copie (séparés par virgule)'),

-- General
('quote_validity_days', '30', 'general', 'Validité des devis en jours'),
('currency', 'MUR', 'general', 'Devise'),
('currency_symbol', 'Rs', 'general', 'Symbole devise'),
('tax_rate', '15', 'general', 'Taux de TVA en %');

-- Default Email Templates
INSERT INTO email_templates (template_key, subject, body_html, body_text, variables) VALUES
('quote_confirmation', 'Votre devis Sunbox Mauritius - {{reference}}', 
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
<p>Ce devis est valable jusqu\'au {{valid_until}}.</p>
<p>Notre équipe vous contactera dans les plus brefs délais.</p>
<p style="margin-top: 30px;">Cordialement,<br><strong>L\'équipe Sunbox Mauritius</strong></p>
</div>
<div style="background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
<p>Sunbox Mauritius - Grand Baie, Mauritius</p>
<p>Tel: +230 5250 1234 | Email: info@sunbox-mauritius.com</p>
</div>
</body>
</html>',
'Bonjour {{customer_name}},\n\nMerci pour votre demande de devis.\n\nRéférence: {{reference}}\nModèle: {{model_name}}\nTotal: Rs {{total_price}}\n\nCe devis est valable jusqu\'au {{valid_until}}.\n\nCordialement,\nL\'équipe Sunbox Mauritius',
'["customer_name", "reference", "model_name", "base_price", "options_total", "total_price", "valid_until"]'),

('quote_admin_notification', 'Nouveau devis reçu - {{reference}}',
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
<a href="{{admin_url}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir dans l\'admin</a>
</p>
</div>
</body>
</html>',
'Nouveau devis reçu\n\nRéférence: {{reference}}\nClient: {{customer_name}}\nEmail: {{customer_email}}\nTéléphone: {{customer_phone}}\nModèle: {{model_name}}\nTotal: Rs {{total_price}}\n\nMessage: {{customer_message}}',
'["reference", "customer_name", "customer_email", "customer_phone", "customer_address", "model_name", "model_type", "base_price", "options_total", "total_price", "customer_message", "admin_url"]'),

('quote_approved', 'Votre devis {{reference}} a été approuvé',
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
<p style="margin-top: 30px;">Cordialement,<br><strong>L\'équipe Sunbox Mauritius</strong></p>
</div>
</body>
</html>',
'Bonjour {{customer_name}},\n\nVotre devis {{reference}} a été approuvé.\nModèle: {{model_name}}\nTotal: Rs {{total_price}}\n\nNotre équipe vous contactera prochainement.\n\nCordialement,\nL\'équipe Sunbox Mauritius',
'["customer_name", "reference", "model_name", "total_price"]'),

('contact_confirmation', 'Nous avons bien reçu votre message',
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
<p style="margin-top: 30px;">Cordialement,<br><strong>L\'équipe Sunbox Mauritius</strong></p>
</div>
</body>
</html>',
'Bonjour {{name}},\n\nNous avons bien reçu votre message et nous vous en remercions.\n\nCordialement,\nL\'équipe Sunbox Mauritius',
'["name", "message"]');

-- ============================================
-- VIEWS (Compatible with phpMyAdmin)
-- ============================================

-- View: Quote details with options
CREATE VIEW v_quotes_details AS
SELECT 
    q.*,
    m.name as model_display_name,
    m.type as model_display_type,
    u.name as assigned_user_name,
    (SELECT COUNT(*) FROM quote_options WHERE quote_id = q.id) as options_count
FROM quotes q
LEFT JOIN models m ON q.model_id = m.id
LEFT JOIN users u ON q.assigned_to = u.id;

-- View: Model statistics
CREATE VIEW v_model_stats AS
SELECT 
    m.id,
    m.name,
    m.type,
    m.base_price,
    COUNT(q.id) as quote_count,
    COALESCE(SUM(q.total_price), 0) as total_revenue,
    AVG(q.total_price) as avg_quote_value
FROM models m
LEFT JOIN quotes q ON q.model_id = m.id
GROUP BY m.id, m.name, m.type, m.base_price;

-- View: Dashboard statistics
CREATE VIEW v_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM quotes) as total_quotes,
    (SELECT COUNT(*) FROM quotes WHERE status = 'pending') as pending_quotes,
    (SELECT COUNT(*) FROM quotes WHERE status = 'approved') as approved_quotes,
    (SELECT COUNT(*) FROM quotes WHERE DATE(created_at) = CURDATE()) as today_quotes,
    (SELECT COALESCE(SUM(total_price), 0) FROM quotes WHERE status = 'approved') as total_revenue,
    (SELECT COUNT(*) FROM contacts WHERE status = 'new') as new_contacts;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_quotes_date_status ON quotes(created_at, status);
CREATE INDEX idx_quotes_customer ON quotes(customer_name, customer_email);
CREATE INDEX idx_models_type_active ON models(type, is_active);
CREATE INDEX idx_options_type_active ON options(product_type, is_active);

-- ============================================
-- END OF DEPLOYMENT SCRIPT
-- ============================================

SELECT 'Database deployment completed successfully!' AS Status;
SELECT COUNT(*) AS 'Models Created' FROM models;
SELECT COUNT(*) AS 'Options Created' FROM options;
SELECT COUNT(*) AS 'Settings Created' FROM settings;
SELECT COUNT(*) AS 'Email Templates Created' FROM email_templates;
