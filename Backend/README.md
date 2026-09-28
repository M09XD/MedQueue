# MedQueue API (frameworkless PHP)

This backend provides JSON endpoints used by the existing frontend pages.
Only `Backend/public/` should be web-accessible.

## Local run (PHP built-in server)

From `Backend/`:

```bash
php -S 127.0.0.1:8099 -t public
```

Example endpoints:

- `GET http://127.0.0.1:8099/api/health`
- `GET http://127.0.0.1:8099/api/auth/csrf` (issues CSRF token + session cookie)

## Environment setup

1. Copy `.env.example` to `.env`
2. Configure database credentials (`DB_*`)
3. Keep `.env` private (already ignored by git)

## Database setup

Use helper scripts from `Backend/bin/`:

```bash
php bin/migrate.php
php bin/seed.php
```

## Apache/XAMPP notes

- Serve frontend and API on the same origin when possible
- Do not expose `src/`, `database/`, `storage/`, or `.env`
- Use `Backend/public/index.php` as the entry point
