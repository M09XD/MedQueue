# MedQueue Migration Progress

## CP-002 — Backend foundation + schema + auth wiring
**Date:** 2026-09-28

### Completed
- Added backend skeleton (router, request/response abstraction, middleware pipeline)
- Added environment/config loading and PDO connection layer
- Added API controllers for auth, patient queue, doctor queue actions, admin config, reports
- Added queue service with transactional locking and queue-state transitions
- Added migration runner + initial schema SQL
- Added seed runner with admin/doctor demo accounts and config defaults
- Added environment doctor-check script
- Added frontend API client (`Frontend/shared/api.js`)
- Switched login/register/logout flows to backend API

### Important behavior now enforced
- Patient login no longer asks full name
- Role tabs in login are hints; server decides role
- Auto-cancel logic targets only `called` state
- Timezone defaults to `Asia/Dhaka`

### Not run (sandbox limitation)
- PHP lint/tests and DB migration execution (PHP not installed in sandbox)
- Full end-to-end queue lifecycle test against MySQL

### Next targets
- Replace remaining localStorage queue simulation on patient/doctor dashboards with API polling
- Replace admin doctors/specialties CRUD with API-backed operations
- Pin CDN versions and add verified SRI hashes after user-side hash computation
- Run PHPUnit + integration verification in XAMPP and record PASS/FAIL/NOT RUN
