# Environment and secret management

The backend reads local development values from a root `.env` file. The real
file is ignored by Git; `.env.example` is the committed configuration contract.

## Local development

```bash
cp .env.example .env
openssl rand -base64 48
```

Put the generated value in `JWT_SECRET` and replace the database placeholders
with credentials for the intended local or Supabase project. Do not paste
production secrets into source files, issues, logs, screenshots, or chat.

Run the backend with:

```bash
cd backend
mvn spring-boot:run
```

For an existing Supabase database, keep Flyway enabled and use
`JPA_DDL_AUTO=validate`. The first rollout should be preceded by a database
backup and schema check.

## Deployment

Inject `SPRING_DATASOURCE_URL`, `DB_USER`, `DB_PASSWORD`, and `JWT_SECRET`
through the deployment provider's secret manager or protected CI environment.
Use a unique least-privilege database user and a unique JWT secret for every
environment. Keep `APP_DEFAULT_ADMIN_ENABLED=false` outside disposable local
development.

## Pre-push checks

```bash
git diff --check
git diff --cached --name-only
git grep -n -I -E 'password|secret|token|api[_-]?key' -- .
```

For stronger assurance, run a secret scanner such as `gitleaks detect --redact`.
If a secret was ever committed, rotate it immediately; removing the file alone
does not make the old value safe.
