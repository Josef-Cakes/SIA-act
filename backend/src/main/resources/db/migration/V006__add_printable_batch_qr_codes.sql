ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS qr_code VARCHAR(100);

UPDATE batches
SET qr_code = 'FARM-BATCH-' || id
WHERE qr_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_batches_qr_code
    ON batches(qr_code)
    WHERE qr_code IS NOT NULL;
