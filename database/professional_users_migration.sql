-- Professional Users Migration
-- Adds 'professional' role and related tables

-- 1. Add 'professional' to users.role enum
ALTER TABLE users MODIFY COLUMN role ENUM('admin','manager','sales','professional') NOT NULL DEFAULT 'sales';

-- 2. Professional profiles table
CREATE TABLE IF NOT EXISTS professional_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL DEFAULT '',
    address TEXT,
    vat_number VARCHAR(100),
    brn_number VARCHAR(100),
    phone VARCHAR(50),
    logo_url VARCHAR(500),
    sunbox_margin_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    credits DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Professional packs table
CREATE TABLE IF NOT EXISTS professional_packs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 10000,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Professional credit transactions table
CREATE TABLE IF NOT EXISTS professional_credit_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason ENUM('pack_purchase','quote_created','quote_validated','boq_requested','model_request','production_deduction') NOT NULL,
    quote_id INT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Professional model requests table
CREATE TABLE IF NOT EXISTS professional_model_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    description TEXT NOT NULL,
    container_20ft_count INT NOT NULL DEFAULT 0,
    container_40ft_count INT NOT NULL DEFAULT 0,
    bedrooms INT NOT NULL DEFAULT 0,
    bathrooms INT NOT NULL DEFAULT 0,
    sketch_url VARCHAR(500),
    status ENUM('pending','in_review','completed','rejected') NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
