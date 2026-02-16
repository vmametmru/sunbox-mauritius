-- ============================================
-- SUNBOX MAURITIUS - Migration: Add Contacts Link
-- ============================================
-- This migration adds the contact-quote relationship and
-- enables client info reuse functionality
-- ============================================

-- Add new columns to contacts table
DROP PROCEDURE IF EXISTS _add_cols_contacts;
DELIMITER //
CREATE PROCEDURE _add_cols_contacts()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'contacts'
          AND COLUMN_NAME = 'address'
    ) THEN
        ALTER TABLE contacts ADD COLUMN address TEXT NULL AFTER phone;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'contacts'
          AND COLUMN_NAME = 'device_id'
    ) THEN
        ALTER TABLE contacts ADD COLUMN device_id VARCHAR(100) NULL AFTER message;
    END IF;

    ALTER TABLE contacts MODIFY COLUMN message TEXT NULL;
END //
DELIMITER ;
CALL _add_cols_contacts();
DROP PROCEDURE IF EXISTS _add_cols_contacts;

-- Add index for device_id for fast lookups
DROP PROCEDURE IF EXISTS _add_idx_contacts_device_id;
DELIMITER //
CREATE PROCEDURE _add_idx_contacts_device_id()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'contacts'
          AND INDEX_NAME = 'idx_contacts_device_id'
    ) THEN
        CREATE INDEX idx_contacts_device_id ON contacts(device_id);
    END IF;
END //
DELIMITER ;
CALL _add_idx_contacts_device_id();
DROP PROCEDURE IF EXISTS _add_idx_contacts_device_id;

-- Add contact_id to quotes table to link quotes with contacts
DROP PROCEDURE IF EXISTS _add_col_quotes_contact_id;
DELIMITER //
CREATE PROCEDURE _add_col_quotes_contact_id()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'quotes'
          AND COLUMN_NAME = 'contact_id'
    ) THEN
        ALTER TABLE quotes ADD COLUMN contact_id INT NULL AFTER customer_message;
    END IF;
END //
DELIMITER ;
CALL _add_col_quotes_contact_id();
DROP PROCEDURE IF EXISTS _add_col_quotes_contact_id;

-- Add foreign key constraint
DROP PROCEDURE IF EXISTS _add_fk_quotes_contact;
DELIMITER //
CREATE PROCEDURE _add_fk_quotes_contact()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_NAME = 'fk_quotes_contact'
          AND TABLE_NAME = 'quotes'
          AND TABLE_SCHEMA = DATABASE()
    ) THEN
        ALTER TABLE quotes
            ADD CONSTRAINT fk_quotes_contact
            FOREIGN KEY (contact_id) REFERENCES contacts(id)
            ON DELETE SET NULL;
    END IF;
END //
DELIMITER ;
CALL _add_fk_quotes_contact();
DROP PROCEDURE IF EXISTS _add_fk_quotes_contact;

-- Add index for contact_id for fast lookups
DROP PROCEDURE IF EXISTS _add_idx_quotes_contact_id;
DELIMITER //
CREATE PROCEDURE _add_idx_quotes_contact_id()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'quotes'
          AND INDEX_NAME = 'idx_quotes_contact_id'
    ) THEN
        CREATE INDEX idx_quotes_contact_id ON quotes(contact_id);
    END IF;
END //
DELIMITER ;
CALL _add_idx_quotes_contact_id();
DROP PROCEDURE IF EXISTS _add_idx_quotes_contact_id;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Migration completed successfully!' AS Status;
