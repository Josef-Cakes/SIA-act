-- Immutable operation lifecycle and actionable work records.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS status VARCHAR(20);

UPDATE events
SET status = 'POSTED'
WHERE status IS NULL;

ALTER TABLE events
    ALTER COLUMN status SET DEFAULT 'POSTED';

ALTER TABLE events
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS correction_of_id BIGINT REFERENCES events(id);

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS correction_reason VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_events_correction_of_id
    ON events(correction_of_id);

-- A posted event can have at most one compensating correction. The partial
-- unique index also closes the race between two concurrent correction calls.
CREATE UNIQUE INDEX IF NOT EXISTS uq_events_correction_of_id
    ON events(correction_of_id)
    WHERE correction_of_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS farm_tasks (
    id BIGSERIAL PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 0,
    task_key VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    location_label VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    due_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_user_id BIGINT REFERENCES users(id),
    batch_id BIGINT REFERENCES batches(id),
    created_by_id BIGINT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_farm_tasks_assignee_status
    ON farm_tasks(assigned_user_id, status);

CREATE INDEX IF NOT EXISTS idx_farm_tasks_due_at
    ON farm_tasks(due_at);

CREATE TABLE IF NOT EXISTS operational_alerts (
    id BIGSERIAL PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 0,
    rule_code VARCHAR(80) NOT NULL,
    message VARCHAR(500) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'WARNING',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    due_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_note VARCHAR(500),
    assigned_user_id BIGINT REFERENCES users(id),
    batch_id BIGINT REFERENCES batches(id),
    created_by_id BIGINT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_assignee_status
    ON operational_alerts(assigned_user_id, status);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_due_at
    ON operational_alerts(due_at);
