# MedQueue Backend API (frameworkless PHP)

This backend is the single server-side runtime for MedQueue.

- **Entry point:** `Backend/public/index.php`
- **Public web root:** `Backend/public/` only
- **Canonical migration source:** `Backend/database/migrations/*.sql`
- **Canonical seed source:** `Backend/database/seeds/*.sql`

## API contract (canonical)

Base path is `/api` (effective paths may include `/Backend/public` depending on your Apache/XAMPP virtual-host root).

### Auth
- `GET /api/auth/csrf`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Public catalog
- `GET /api/public/specialties`
- `GET /api/public/doctors`

### Patient
- `GET /api/patient/tokens`
- `POST /api/patient/tokens`
- `POST /api/patient/tokens/{tokenId}/cancel`

### Doctor
- `GET /api/doctor/queue`
- `POST /api/doctor/tokens/{tokenId}/transition`

### Admin
- `GET /api/admin/analytics`
- `GET /api/admin/reports`
- `GET /api/admin/reports/{reportId}`

### Compatibility aliases
To avoid breaking older frontend callers, aliases remain available:
- `GET /api/csrf` (alias of `/api/auth/csrf`)
- `GET /api/specialties` (alias of `/api/public/specialties`)
- `GET /api/doctors` (alias of `/api/public/doctors`)

## Environment setup

1. Copy `.env.example` to `.env`
2. Set DB credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`)
3. Optional: set `APP_TIMEZONE` (default `Asia/Dhaka`)

## Database setup

Use either `bin/` or `scripts/` commands (both point to `database/*` SQL trees):

```bash
php bin/migrate.php
php bin/seed.php
```

## Local run (PHP built-in server)

From `Backend/`:

```bash
php -S 127.0.0.1:8099 -t public public/router.php
```

Health check:

```bash
curl -s http://127.0.0.1:8099/api/health
```

## Runtime verification checklist (XAMPP / local PHP)

Run:

```bash
bash bin/runtime-verify.sh
```

This verifies:
- required PHP extensions and Argon2 availability
- migration + seed execution
- session/cookie + CSRF flow via live HTTP calls
- endpoint contract aliases
