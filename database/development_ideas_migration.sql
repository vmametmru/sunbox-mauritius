-- ============================================
-- SUNBOX MAURITIUS - Development Ideas Migration
-- ============================================
-- Table for tracking development ideas and future features
-- ============================================

CREATE TABLE IF NOT EXISTS development_ideas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    script TEXT,
    statut ENUM('non_demarree', 'en_cours', 'completee') DEFAULT 'non_demarree',
    urgence ENUM('urgent', 'non_urgent') DEFAULT 'non_urgent',
    importance ENUM('important', 'non_important') DEFAULT 'non_important',
    priority_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_statut (statut),
    INDEX idx_urgence (urgence),
    INDEX idx_importance (importance),
    INDEX idx_priority (priority_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
