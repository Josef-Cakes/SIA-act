-- Inventory safety fields. This migration is intentionally idempotent so it
-- can be applied to databases that were previously managed by ddl-auto=update.

ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS version BIGINT;

UPDATE batches
SET version = 0
WHERE version IS NULL;

ALTER TABLE batches
    ALTER COLUMN version SET DEFAULT 0;

ALTER TABLE batches
    ALTER COLUMN version SET NOT NULL;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS measured_quantity NUMERIC(19, 4);

UPDATE events
SET measured_quantity = quantity
WHERE measured_quantity IS NULL
  AND event_type_id IN (
      SELECT id FROM event_types WHERE code = 'FEEDING'
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_events_idempotency_key
    ON events(idempotency_key)
    WHERE idempotency_key IS NOT NULL;
