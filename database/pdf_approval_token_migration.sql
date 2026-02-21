-- ============================================================
-- Migration: add approval_token to quotes table
--
-- Compatible with:
--   MySQL 8.0.39-cll-lve (cPanel / nl1-ss108)
--   phpMyAdmin via cPanel (no manual DELIMITER change needed –
--   phpMyAdmin handles it automatically for stored procedures)
--
-- Run ONCE on production. Safe to re-run (all steps are guarded).
-- ============================================================

DROP PROCEDURE IF EXISTS _add_approval_token_to_quotes;

CREATE PROCEDURE _add_approval_token_to_quotes()
BEGIN
    -- ── Step 1: add the column (nullable first so existing rows are safe) ──
    IF NOT EXISTS (
        SELECT 1
        FROM   information_schema.COLUMNS
        WHERE  TABLE_SCHEMA = DATABASE()
          AND  TABLE_NAME   = 'quotes'
          AND  COLUMN_NAME  = 'approval_token'
    ) THEN
        ALTER TABLE quotes
            ADD COLUMN approval_token VARCHAR(64) NULL
            COMMENT 'Random token used to authenticate client quote-action links';
    END IF;

    -- ── Step 2: back-fill NULLs with a UUID-based token (unique per row) ──
    --   NOTE: This UUID back-fill is only for pre-existing rows that never had
    --   a token. All new quotes get a cryptographically-secure token from PHP
    --   (bin2hex(random_bytes(32))) via the application layer.
    --   UUID() is evaluated fresh for every row in an UPDATE (MySQL docs §12.22)
    --   REPLACE removes hyphens → 32 hex chars, well within VARCHAR(64)
    UPDATE quotes
    SET    approval_token = LOWER(REPLACE(UUID(), '-', ''))
    WHERE  approval_token IS NULL;

    -- ── Step 3: now enforce NOT NULL ──
    IF EXISTS (
        SELECT 1
        FROM   information_schema.COLUMNS
        WHERE  TABLE_SCHEMA  = DATABASE()
          AND  TABLE_NAME    = 'quotes'
          AND  COLUMN_NAME   = 'approval_token'
          AND  IS_NULLABLE   = 'YES'
    ) THEN
        ALTER TABLE quotes
            MODIFY COLUMN approval_token VARCHAR(64) NOT NULL
            COMMENT 'Random token used to authenticate client quote-action links';
    END IF;

    -- ── Step 4: unique index for O(1) token look-ups ──
    IF NOT EXISTS (
        SELECT 1
        FROM   information_schema.STATISTICS
        WHERE  TABLE_SCHEMA = DATABASE()
          AND  TABLE_NAME   = 'quotes'
          AND  INDEX_NAME   = 'idx_quotes_approval_token'
    ) THEN
        ALTER TABLE quotes
            ADD UNIQUE INDEX idx_quotes_approval_token (approval_token);
    END IF;
END;

CALL _add_approval_token_to_quotes();
DROP PROCEDURE IF EXISTS _add_approval_token_to_quotes;
