-- PDF Templates Migration
-- Adds table for customizable PDF document templates (Devis, Rapports, Factures)

CREATE TABLE IF NOT EXISTS pdf_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type ENUM('devis', 'rapport', 'facture') NOT NULL DEFAULT 'devis',
    grid_data JSON NOT NULL COMMENT 'Cell layout: merged cells, content, variables, formatting',
    row_count INT NOT NULL DEFAULT 20,
    col_count INT NOT NULL DEFAULT 10,
    row_heights JSON COMMENT 'Array of row heights in mm',
    col_widths JSON COMMENT 'Array of column widths in mm',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_document_type (document_type),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
