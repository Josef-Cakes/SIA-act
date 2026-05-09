-- ============================================================================
-- Migration Script: Create 'activity_logs' table
-- ============================================================================
-- Purpose: Stores asynchronous audit trail entries for security and analytics.
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_id BIGINT NULL,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(64) NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
    ON activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_logged_at
    ON activity_logs(logged_at);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action
    ON activity_logs(action);
