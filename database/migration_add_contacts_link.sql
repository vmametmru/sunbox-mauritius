-- ============================================
-- SUNBOX MAURITIUS - Migration: Add Contacts Link
-- ============================================
-- This migration adds the contact-quote relationship and
-- enables client info reuse functionality
-- ============================================

-- Add new columns to contacts table
ALTER TABLE contacts 
    ADD COLUMN IF NOT EXISTS address TEXT NULL AFTER phone,
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(100) NULL AFTER message,
    MODIFY COLUMN message TEXT NULL;

-- Add index for device_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_contacts_device_id ON contacts(device_id);

-- Add contact_id to quotes table to link quotes with contacts
ALTER TABLE quotes 
    ADD COLUMN IF NOT EXISTS contact_id INT NULL AFTER customer_message;

-- Add foreign key constraint
ALTER TABLE quotes 
    ADD CONSTRAINT fk_quotes_contact 
    FOREIGN KEY (contact_id) REFERENCES contacts(id) 
    ON DELETE SET NULL;

-- Add index for contact_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_quotes_contact_id ON quotes(contact_id);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Migration completed successfully!' AS Status;
