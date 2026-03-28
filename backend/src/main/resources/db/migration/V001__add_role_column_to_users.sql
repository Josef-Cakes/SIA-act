-- ============================================================================
-- Migration Script: Add 'role' column to 'users' table
-- ============================================================================
-- Purpose: Safely add the role column to the existing users table with data
-- Author: RBAC Implementation Team
-- Date: 2026-03-27
-- ============================================================================

-- Step 1: Add the 'role' column as NULLABLE first (allows existing rows)
-- This prevents the "ERROR: column contains null values" issue
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20);

-- Step 2: Set default role for all existing users
-- Any existing users without a role will be assigned ROLE_HANDLER
UPDATE users
SET role = 'ROLE_HANDLER'
WHERE role IS NULL;

-- Step 3: Now safely add the NOT NULL constraint
-- Since all rows now have a value, this will succeed
ALTER TABLE users
ALTER COLUMN role SET NOT NULL;

-- Step 4: Add CHECK constraint to enforce valid role values
-- Only ROLE_ADMIN and ROLE_HANDLER are allowed
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('ROLE_ADMIN', 'ROLE_HANDLER'));

-- Step 5: Add index on role column for faster role-based queries
-- This improves performance for queries like findByRole() in UserRepository
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- ============================================================================
-- Verification Queries (Optional - Run these after migration)
-- ============================================================================
-- SELECT COUNT(*) FROM users WHERE role IS NULL;  -- Should return 0
-- SELECT role, COUNT(*) FROM users GROUP BY role;  -- Should show distribution
-- ============================================================================
