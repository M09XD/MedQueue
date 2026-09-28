# MedQueue Backend (PHP + PDO + MySQL)

This backend is designed for XAMPP (`htdocs/MedQueue`) with **same-origin** frontend+API.

## Runtime stack
- PHP 8.2+ (8.4-safe syntax)
- MariaDB/MySQL (tested design target: MariaDB 10.4+)
- Apache with `mod_rewrite` + `.htaccess`

## API base URL (default XAMPP layout)
`/MedQueue/Backend/public/api/v1`

## Setup

1. Copy env template:
   ```bash
   cp Backend/.env.example Backend/.env
   ```
2. Install dependencies (if Composer available):
   ```bash
   composer install
   ```
3. Create database (e.g. `medqueue`) and update `Backend/.env`.
4. Run migrations:
   ```bash
   php Backend/bin/migrate.php
   ```
5. Run seeders:
   ```bash
   php Backend/bin/seed.php
   ```
6. Optional env check:
   ```bash
   php Backend/bin/doctor-check.php
   ```

## Seed accounts
- Admin: `admin@medqueue.hospital` / `Admin@12345`
- Doctor demo accounts:
  - `sarah.chen@medqueue.hospital` / `Doctor@12345`
  - `michael.rodriguez@medqueue.hospital` / `Doctor@12345`
  - `aisha.rahman@medqueue.hospital` / `Doctor@12345`

## API highlights
- Cookie session auth (`HttpOnly`, same-origin)
- CSRF token endpoint (`GET /auth/csrf`) + `X-CSRF-Token` enforcement on writes
- Queue flow: `waiting -> called -> in_progress -> completed|skipped|auto_skipped|cancelled`
- Auto-cancel applies to **called** state only (lazy cleanup)
- DB constraints enforce:
  - one active token per patient
  - one in-progress token per doctor
  - unique token numbers per doctor/day

## Frontend integration (already wired)
- `Frontend/shared/api.js` handles API base, session credentials and CSRF.
- Login/Register use backend auth endpoints.
- Navbar logout calls backend logout endpoint before clearing local state.

## Testing
- PHPUnit config exists (`phpunit.xml`)
- In this sandbox, PHP is unavailable, so tests are **not run** here.
