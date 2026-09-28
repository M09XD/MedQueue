# MedQueue v1 architecture

Living document. Source of truth for implementation after checkpoint `PHASE-1-ARCHITECTURE-20260928`. Frontend pages stay as they are; PHP is a JSON API.

This is **not** a HIPAA/GDPR compliance claim. It is a course/demo design: least privilege, hashed passwords, audit of sensitive reads, no PHI in logs.

## Locked product rules (v1)

- Frameworkless PHP 8.x, layered. Composer: PSR-4 autoload only unless a utility is a clear win.
- PHP sessions + HttpOnly cookies. Session ID regenerated after login; destroyed on logout. Browser `localStorage` is never the auth source of truth.
- One role per account: `patient` | `doctor` | `admin`.
- Single hospital. No branch tables.
- Shared server-side queue: patient tokens and the doctor dashboard use the same rows.
- Admin clinical-report access requires an **explicit** permission flag, not the admin role alone. Reads are audited.
- Doctors see reports only for patients in their care/queue association.
- Patients see only their own reports.
- Doctors with history are never hard-deleted: `account_status` / `deactivated_at`. Inactive doctors cannot take new bookings and are omitted from active booking lists; history stays linked.
- New doctor accounts: admin supplies email + profile; **server generates** a temporary password; store hash only; `must_change_password = 1` until first successful change.
- No SMS/email in v1. Notification ports exist as interfaces; only in-app/polling implementations ship.
- Queue UX: short polling (active ~3–5s; pause when tab hidden; backoff; no overlapping requests).
- XAMPP local/demo. GitHub Pages stays a static Frontend prototype (no PHP).

## Runtime layout

```
Browser (existing Frontend/*.html)
    │  fetch(..., { credentials: "include" })
    ▼
Apache (XAMPP)  Document root = project folder or Alias
    ├── Frontend/          static pages (unchanged folders)
    └── Backend/public/    sole PHP web root (index.php front controller)
            │
            ▼
        Backend/src        (not web-reachable)
        Backend/config
        Backend/migrations
        Backend/.env       (not web-reachable; gitignored)
```

**v1 local serving:** use Apache so Frontend and API share scheme+host+port (same origin). Example: `http://localhost/MedQueue/Frontend/...` and `http://localhost/MedQueue/Backend/public/api/...`.

If someone serves Frontend from another port (Live Server), that is cross-origin; CORS in `.env` can allow a single extra origin for local work. Cookies: `SameSite=Lax` (or `None`+`Secure` only on HTTPS). `Secure` cookie flag is off on http://localhost, on when `APP_URL` is https.

GitHub Pages: Frontend only; API calls will fail there by design until a hosted PHP backend exists.

## Layered PHP (no framework)

```
public/index.php          bootstrap, session start, dispatch
src/Http/                 Router, Request, JsonResponse, errors, CSRF
src/Auth/                 SessionAuth, password hashing, login/logout
src/Domain/               QueueService, ReportAccess, DoctorDirectory, …
src/Infra/                PdoConnection, FileRateLimiter, PhpMailNotifier (no-op)
src/Support/              Env, Clock, random token helpers
config/                   routes.php, app.php (no secrets)
migrations/               numbered .sql
storage/                  rate-limit files, app logs (no PHI)
```

Request flow: Router → auth/CSRF/rate-limit middleware → controller-thin action → domain service (transactions) → PDO → JSON.

## HTTP API (v1 contract)

Prefix: `/api`. JSON in/out. Errors: `{ "error": { "code": "...", "message": "safe string" } }`.

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/health` | none | liveness, no secrets |
| GET | `/csrf` | session optional | issues CSRF token for cookie session |
| POST | `/auth/register` | none | patient only |
| POST | `/auth/login` | none | email+password; role from DB not from client |
| POST | `/auth/logout` | session | destroy session |
| GET | `/auth/me` | session | current user; no password fields |
| POST | `/auth/change-password` | session | required when `must_change_password` |
| GET | `/specialties` | none | active specialties |
| GET | `/doctors` | none | **active** doctors only for booking lists |
| POST | `/tokens` | patient | book; `Idempotency-Key` required |
| GET | `/tokens` | patient | own tokens + derived position |
| POST | `/tokens/{id}/cancel` | patient | own waiting token |
| GET | `/reports` | patient | own reports |
| GET | `/doctor/queue` | doctor | same queue rows as patient tokens |
| POST | `/doctor/queue/{id}/call` | doctor | own queue |
| POST | `/doctor/queue/{id}/complete` | doctor | |
| POST | `/doctor/queue/{id}/skip` | doctor | |
| POST | `/doctor/queue/{id}/emergency` | doctor | flag |
| PATCH | `/doctor/availability` | doctor | on-shift flag; not the same as account_status |
| GET | `/doctor/reports` | doctor | associated patients only |
| GET | `/admin/doctors` | admin | includes inactive |
| POST | `/admin/doctors` | admin | create user+doctor; returns **one-time** temp password |
| PATCH | `/admin/doctors/{id}` | admin | profile; deactivate via status not DELETE |
| POST | `/admin/doctors/{id}/deactivate` | admin | soft |
| POST | `/admin/doctors/{id}/reactivate` | admin | |
| GET/POST/PATCH | `/admin/specialties` | admin | |
| GET | `/admin/reports` | admin **+** `can_view_clinical_reports` | audited |
| GET | `/poll/queue` | session | lightweight snapshot + `updated_at` for polling |

State-changing methods require CSRF header `X-CSRF-Token` matching the session token (except login/register which use the same header after GET `/csrf`).

Admin “hard delete doctor” is **not** offered.

## Data model (MySQL / MariaDB)

Users (accounts):

- `id`, `email` UNIQUE, `password_hash`, `role` ENUM, `display_name`
- `must_change_password` BOOLEAN
- `can_view_clinical_reports` BOOLEAN default 0 (**never** inferred from role in code)
- `created_at`, `updated_at`

Patients:

- `id`, `user_id` UNIQUE, `public_code` (e.g. PAT-1023), `phone`, `condition_note`, `joined_at`

Doctors:

- `id`, `user_id` UNIQUE, `specialty_id`, `room`, `avg_wait_minutes`, `rating`, `photo_ref`
- `is_available` (shift) BOOLEAN
- `account_status` ENUM(`active`,`inactive`)
- `deactivated_at` NULL
- No `DELETE FROM doctors` in application code when tokens/reports exist (always soft-deactivate)

Specialties: `id`, `name` UNIQUE.

Queue tokens (authoritative queue):

- `id`, `public_number` (server-generated, unique per doctor/day)
- `patient_id`, `doctor_id`, `status` (`waiting`,`in_progress`,`completed`,`skipped`,`cancelled`)
- `is_emergency`, `created_at`, `updated_at`, `completed_at`
- Position for display: computed in a transaction as count of waiting rows for that doctor that sort before this token (`is_emergency` DESC, `created_at` ASC), not a client timer.

Reports:

- `id`, `patient_id`, `doctor_id`, `queue_token_id` NULL, `visited_at`
- `diagnosis`, `prescription`, `follow_up`, `status`
- Access in PHP only via `ReportAccess` service.

Idempotency keys: `id`, `user_id`, `key`, `request_hash`, `response_json`, `created_at` UNIQUE(user_id, key).

Audit (no clinical text): `id`, `actor_user_id`, `action`, `resource_type`, `resource_id`, `created_at`, `ip` optional.

Seed: one demo patient, eight doctors matching current directory emails, one admin with `can_view_clinical_reports=1` **granted in seed**, not by role logic. Passwords hashed. Credentials documented as demo-only in `docs/DEMO_CREDENTIALS.md` (fake domain, not production).

## Security

- `password_hash` / `password_verify`; `PASSWORD_ARGON2ID` if defined, else `PASSWORD_DEFAULT`.
- PDO prepared statements. Queue mutations: `BEGIN`; `SELECT ... FOR UPDATE` on doctor queue rows; commit.
- Session cookie: `HttpOnly`, `SameSite=Lax`, `Secure` when HTTPS, path `/`, name not PHPSESSID default if easy (`mq_sess`).
- Rate limiter interface; file storage under `storage/ratelimit` for XAMPP.
- Do not log email+password, diagnosis, prescription, or temp passwords.
- Frontend must stop using `medqueue.user` as authorization after API wiring (later phase). Until then, new API ignores that key.

## Notifications

```
interface Notifier { public function notifyTurn(int $patientUserId, array $payload): void; }
```

v1: `NullNotifier` or in-app only (client sees status via poll). Email/SMS classes can be added later without changing queue services.

## Polling

Client: poll `/poll/queue` every 3–5s while the queue view is visible; `document.hidden` → pause; on HTTP errors exponential backoff; abort previous in-flight request. Server: return compact JSON + `updated_at`; 304/empty body when `If-None-Match` / `since` unchanged (implement when wiring frontend).

## Out of v1

Multi-branch, SMS/email send, Laravel, WebSockets, real HIPAA program, admin-chosen permanent doctor passwords, hard-delete of doctors with history, GitHub Pages as a live API host.
