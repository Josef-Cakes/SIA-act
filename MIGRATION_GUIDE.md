# Database Migration Guide: Adding 'role' Column to 'users' Table

## 📋 Problem Analysis

### Root Cause

You encountered the following PostgreSQL error:

```
org.postgresql.util.PSQLException: ERROR: column "role" of relation "users" contains null values
...
Caused by: org.hibernate.exception.SQLGrammarException: could not execute statement
[ERROR: column "role" of relation "users" does not exist]
```

### Why This Happens

1. **Entity Definition:** Your `User.java` entity defines the `role` field with `nullable = false`:
   ```java
   @Column(name = "role", nullable = false, length = 20)
   private Role role = Role.ROLE_HANDLER;
   ```

2. **Hibernate DDL Mode:** Your `application.properties` has `spring.jpa.hibernate.ddl-auto=update`

3. **The Migration Conflict:**
   - Hibernate attempts: `ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL`
   - PostgreSQL rejects this because existing rows would have NULL values
   - The database rejects adding a NOT NULL column to a populated table without default values

4. **Cascading Failure:**
   - The column is never created (migration fails)
   - DataInitializer tries to save a User with a `role` field
   - PostgreSQL throws "column role does not exist" error
   - Application crashes

---

## ✅ Solution A: Development Environment (Quick Reset)

**Use this if:** You are in local development and can afford to lose existing test data.

### Step 1: Update application.properties

Open: `backend/src/main/resources/application.properties`

Change line 20 from:
```properties
spring.jpa.hibernate.ddl-auto=update
```

To:
```properties
spring.jpa.hibernate.ddl-auto=create
```

### Step 2: Restart the Application

```bash
cd backend
mvn spring-boot:run
```

**What happens:**
- Hibernate will drop the entire `users` table
- Recreate it with the `role` column included
- DataInitializer will create the default admin account
- All existing users will be deleted

### Step 3: Revert to Update Mode (Important!)

Once the application starts successfully, change it back:

```properties
spring.jpa.hibernate.ddl-auto=update
```

**Why revert?** Using `create` permanently would wipe your database on every restart.

---

## ✅ Solution B: Production (Preserve Data)

**Use this if:** You have production data or want to keep existing users.

### Option B1: Manual SQL Execution

Connect to your PostgreSQL database using psql, pgAdmin, or any SQL client:

```bash
psql -h aws-1-ap-southeast-1.pooler.supabase.com -p 5432 -U postgres.ygycbrrszmgxpmmbmejv -d postgres
```

Then run the migration script:

```sql
-- Step 1: Add column as nullable
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20);

-- Step 2: Set default for existing rows
UPDATE users SET role = 'ROLE_HANDLER' WHERE role IS NULL;

-- Step 3: Apply NOT NULL constraint
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Step 4: Add CHECK constraint
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('ROLE_ADMIN', 'ROLE_HANDLER'));

-- Step 5: Add performance index
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
```

### Option B2: Using Flyway or Liquibase (Recommended for Production)

#### If using Flyway:

1. **Add Flyway dependency** to `pom.xml`:

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

2. **Update application.properties:**

```properties
# Change from 'update' to 'validate'
spring.jpa.hibernate.ddl-auto=validate

# Enable Flyway
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true
spring.flyway.locations=classpath:db/migration
```

3. **Migration file already created:**
   - Location: `backend/src/main/resources/db/migration/V001__add_role_column_to_users.sql`
   - Flyway will automatically detect and execute it

4. **Restart the application:**

```bash
mvn spring-boot:run
```

Flyway will:
- Detect the new migration script
- Execute it automatically
- Track it in the `flyway_schema_history` table
- Never run it again

---

## 🔍 Entity & Code Review

### User.java Entity (Already Correct)

Location: `backend/src/main/java/com/authapp/entity/User.java:38-42`

```java
// Role-Based Access Control
@Enumerated(EnumType.STRING)
@Column(name = "role", nullable = false, length = 20)
@Builder.Default
private Role role = Role.ROLE_HANDLER;  // Default role for new users
```

✅ **Entity is well-configured:**
- `@Enumerated(EnumType.STRING)` - Stores enum as string ("ROLE_ADMIN", "ROLE_HANDLER")
- `nullable = false` - Enforces NOT NULL constraint
- `@Builder.Default` - Lombok builder will use ROLE_HANDLER as default
- `@PrePersist` hook at line 67 ensures role is never null

### DataInitializer.java (Already Correct)

Location: `backend/src/main/java/com/authapp/config/DataInitializer.java`

✅ **DataInitializer is well-implemented:**
- Checks if admin exists before creating (prevents duplicates)
- Uses BCrypt password encoding
- Explicitly sets role to ROLE_ADMIN
- Logs creation for debugging

---

## 🧪 Verification Steps

After applying either solution, verify the migration worked:

### 1. Check Column Exists

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';
```

Expected output:
```
column_name | data_type         | is_nullable | column_default
-------------------------------------------------------------
role        | character varying | NO          | NULL
```

### 2. Check Constraint

```sql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'users_role_check';
```

Expected output:
```
conname           | contype | pg_get_constraintdef
--------------------------------------------------------
users_role_check  | c       | CHECK ((role)::text = ANY (ARRAY...))
```

### 3. Verify Data

```sql
SELECT username, role FROM users;
```

Expected output (after DataInitializer runs):
```
username   | role
--------------------
admin_sef  | ROLE_ADMIN
(other users with ROLE_HANDLER)
```

### 4. Test Application Endpoints

```bash
# Login as admin
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_sef","password":"Admin@FarmVille2024"}'

# Should return JWT token with role: ROLE_ADMIN
```

---

## 📊 Comparison: Which Solution to Use?

| Criteria | Solution A (Drop/Create) | Solution B (Migration) |
|----------|-------------------------|------------------------|
| **Data Loss** | ❌ Deletes all data | ✅ Preserves all data |
| **Speed** | ⚡ Instant | 🕐 Requires SQL execution |
| **Risk** | 🔴 High (production) | 🟢 Low |
| **Best For** | Local dev, fresh start | Production, staging |
| **Repeatable** | ❌ Must revert config | ✅ Tracked by Flyway |

### Recommendation

- **Local Development:** Use Solution A (faster, no manual SQL)
- **Staging/Production:** Use Solution B with Flyway (safe, auditable)

---

## 🚀 Next Steps

1. **Choose your solution** based on environment
2. **Apply the fix** following the steps above
3. **Verify** using the test queries
4. **Test RBAC** by logging in as admin and handler
5. **Commit the migration script** to version control

---

## ⚠️ Important Notes

### Do NOT do this:

```properties
# NEVER use 'create-drop' in production
spring.jpa.hibernate.ddl-auto=create-drop  # ⛔ DANGEROUS!
```

This will wipe your database on every shutdown.

### Recommended Production Settings:

```properties
# Let Flyway/Liquibase handle migrations
spring.jpa.hibernate.ddl-auto=validate

# Enable schema validation only
spring.flyway.enabled=true
```

---

## 📞 Support

If you encounter issues:

1. Check logs: `backend/logs/spring.log`
2. Verify database connection: `psql` or pgAdmin
3. Review Flyway migration status: `SELECT * FROM flyway_schema_history;`

---

**Migration Script Location:** `backend/src/main/resources/db/migration/V001__add_role_column_to_users.sql`
