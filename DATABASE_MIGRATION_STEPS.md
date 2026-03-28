# PostgreSQL Schema Migration: Adding 'role' Column to 'users' Table

## ⚠️ Problem Summary

**Error 1: Migration Failure**
```
ERROR: column "role" of relation "users" contains null values
```
- Hibernate attempted: `ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL`
- PostgreSQL rejected because existing rows would have NULL values

**Error 2: Cascading Failure**
```
ERROR: column "role" of relation "users" does not exist
```
- Column was never created due to Error 1
- DataInitializer tries to save admin with `role` field
- Database throws "column does not exist"

---

## ✅ SOLUTION: 4-Step Manual Migration

### Step 1: Connect to PostgreSQL Database

```bash
# Connect to your Supabase PostgreSQL instance
psql -h aws-1-ap-southeast-1.pooler.supabase.com \
     -p 5432 \
     -U postgres.ygycbrrszmgxpmmbmejv \
     -d postgres
```

### Step 2: Execute Migration Script

Copy and paste these commands **in order**:

```sql
-- ========================================
-- STEP 2.1: Add role column as NULLABLE
-- ========================================
-- This allows existing rows to accept the new column
ALTER TABLE users
ADD COLUMN role VARCHAR(20);

-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- ========================================
-- STEP 2.2: Populate existing rows
-- ========================================
-- Set default role for all existing users
UPDATE users
SET role = 'ROLE_HANDLER'
WHERE role IS NULL;

-- Verify all rows have values
SELECT COUNT(*) as users_without_role
FROM users
WHERE role IS NULL;
-- Expected: 0

-- ========================================
-- STEP 2.3: Apply NOT NULL constraint
-- ========================================
-- Now safe because all rows have values
ALTER TABLE users
ALTER COLUMN role SET NOT NULL;

-- ========================================
-- STEP 2.4: Add CHECK constraint
-- ========================================
-- Enforce only valid role values
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('ROLE_ADMIN', 'ROLE_HANDLER'));

-- ========================================
-- STEP 2.5: Add performance index
-- ========================================
-- Optimize role-based queries
CREATE INDEX idx_users_role
ON users(role);

-- ========================================
-- VERIFICATION
-- ========================================
-- Check final schema
\d users

-- Check data
SELECT username, email, role
FROM users
ORDER BY created_at;
```

### Step 3: Exit psql

```sql
\q
```

---

## 📋 Verification Checklist

After running the migration, verify:

### ✅ Check 1: Column Exists with Correct Type

```sql
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';
```

**Expected Output:**
```
column_name | data_type         | character_maximum_length | is_nullable | column_default
------------+-------------------+--------------------------+-------------+----------------
role        | character varying | 20                       | NO          | (null)
```

### ✅ Check 2: Constraint Exists

```sql
SELECT
    conname,
    contype,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND conname = 'users_role_check';
```

**Expected Output:**
```
conname           | contype | definition
------------------+---------+--------------------------------------------------
users_role_check  | c       | CHECK ((role)::text = ANY (ARRAY['ROLE_ADMIN'::character varying, 'ROLE_HANDLER'::character varying]::text[]))
```

### ✅ Check 3: All Users Have Roles

```sql
SELECT
    role,
    COUNT(*) as user_count
FROM users
GROUP BY role;
```

**Expected Output:**
```
role         | user_count
-------------+-----------
ROLE_HANDLER | 5
(or whatever users you have)
```

### ✅ Check 4: Index Exists

```sql
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname = 'idx_users_role';
```

**Expected Output:**
```
indexname      | indexdef
---------------+-------------------------------------------
idx_users_role | CREATE INDEX idx_users_role ON public.users USING btree (role)
```

---

## 🔧 Troubleshooting

### If Migration Fails at Step 2.1 (Column Already Exists)

```sql
-- Check if column exists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- If it exists but has wrong type, drop it first
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Then re-run Step 2.1
```

### If Migration Fails at Step 2.3 (Still Has NULLs)

```sql
-- Find rows with NULL role
SELECT id, username, email, role
FROM users
WHERE role IS NULL;

-- Manually update them
UPDATE users
SET role = 'ROLE_HANDLER'
WHERE role IS NULL;
```

### If Migration Fails at Step 2.4 (Invalid Values)

```sql
-- Find invalid role values
SELECT DISTINCT role
FROM users
WHERE role NOT IN ('ROLE_ADMIN', 'ROLE_HANDLER');

-- Fix invalid values
UPDATE users
SET role = 'ROLE_HANDLER'
WHERE role NOT IN ('ROLE_ADMIN', 'ROLE_HANDLER');
```

---

## 🚀 After Migration: Restart Application

Once the migration is complete:

1. **Exit psql:**
   ```bash
   \q
   ```

2. **Start your Spring Boot application:**
   ```bash
   cd /home/sefcurity/Projects/FARMVILLE/SIA-act/backend
   mvn spring-boot:run
   ```

3. **Look for success logs:**
   ```
   ✓ Default admin account created: admin_sef
   Username: admin_sef
   Role: ROLE_ADMIN
   ```

4. **Test the admin login:**
   ```bash
   curl -X POST http://localhost:8080/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin_sef","password":"Admin@FarmVille2024"}'
   ```

---

## 📝 Next Steps

1. ✅ Run the migration script above
2. ✅ Verify using the checklist
3. ✅ Restart your application
4. ✅ Test admin login
5. ✅ Commit the migration script to version control

---

**Migration Script Location:** `backend/src/main/resources/db/migration/V001__add_role_column_to_users.sql`
