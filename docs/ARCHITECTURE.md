# MedQueue Architecture (Checkpoint CP-002)

## Core stack
- Frontend: existing multi-page HTML/CSS/ES modules preserved
- Backend: plain PHP 8 + PDO + custom lightweight router
- Database: MariaDB/MySQL with transactional queue logic and DB invariants

## Security model
- Server sessions via HttpOnly cookies
- CSRF tokens for state-changing endpoints
- Role-based authorization (`patient`, `doctor`, `admin`) on server routes
- Sensitive report access gated by `reports.read_full` permission + audit logging

## Queue semantics
- Primary flow: `waiting -> called -> in_progress -> completed`
- Other terminal states: `cancelled`, `skipped`, `auto_skipped`
- Auto-skip timeout applies only to **called** state (default 15 min)
- Lazy auto-skip runs during doctor/patient queue interactions

## DB-enforced invariants
- One active token per patient (generated column + unique index)
- One in-progress token per doctor (generated column + unique index)
- Per-doctor per-day unique sequence and token number
- FK constraints across users, doctors, queue tokens, and reports

## Time strategy
- Business timezone: `Asia/Dhaka`
- Storage timestamps: UTC
- Daily token reset uses business date derived in app timezone

## Runtime layout
- Public entry only: `Backend/public/index.php`
- Apache rewrite routes all API requests through front controller
- `Backend/.htaccess` blocks direct access to non-public backend paths

## Polling / cache support
- Doctor list endpoint supports ETag + conditional GET (`If-None-Match`)
