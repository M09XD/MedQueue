# MedQueue API (frameworkless PHP)

JSON API for the existing Frontend. Serve `public/` as the only web-reachable PHP directory.

## Local (PHP built-in server)

From this `Backend/` folder, with XAMPP PHP:

```text
C:\xampp\php\php.exe -S 127.0.0.1:8099 -t public public/router.php
```

- `GET http://127.0.0.1:8099/api/health`
- `GET http://127.0.0.1:8099/api/csrf` (starts session cookie `mq_sess`)

Copy `.env.example` to `.env` and set `DB_*` when the database phase is applied.

## XAMPP Apache

Point a vhost or alias so Frontend and `Backend/public` share scheme+host+port. Do not expose `src/`, `config/`, `storage/`, or `.env`. The parent `Backend/.htaccess` denies direct access; clients must use `public/`.

Install dependencies once:

```text
C:\xampp\php\php.exe composer.phar install
```
