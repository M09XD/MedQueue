# MedQueue — Progress Log

Newest checkpoint is at the top. Do not restart Phase 0.

---

Checkpoint ID: PHASE-1-ARCHITECTURE-20260928
Timestamp: 2026-09-28 14:45 +06:00
Phase: 1 (Architecture proposal) + 0B answers recorded
Task: Record locked user decisions; document v1 architecture; then git-sync per decision 14 (not done in this checkpoint yet).
Status: Phase 1 documentation complete. Git sync next, then Phase 2 code.

What was completed:
- All 16 Phase 0B answers plus doctor soft-deactivate rules recorded as locked.
- Architecture written in docs/ARCHITECTURE.md (API, layers, schema, security, polling, notifications).
- No application PHP yet in this checkpoint.

Files added:
- docs/ARCHITECTURE.md
- docs/PROGRESS.md updates (this checkpoint)

Files modified:
- docs/PROGRESS.md

Files removed:
- None

Database changes:
- None (schema proposed only)

API changes:
- Contract proposed in ARCHITECTURE.md; not implemented

Frontend changes:
- None

Security changes:
- Policy locked (sessions, Argon2id, audit, explicit admin report permission); not implemented

Tests/checks run:
- git status (behind origin by 9, untracked docs/)
- PHP via C:\xampp\php\php.exe → 8.2.12
- composer not on PATH

Results:
- Decisions locked (see below). Ready for safe git fetch/ff then Phase 2.

Performance observations:
- N/A (docs only)

Decisions made:
See “Locked user decisions (Phase 0B answers)” below. Architecture details in docs/ARCHITECTURE.md.

Questions requiring user approval:
- None remaining from Phase 0B. New blocking items: none at Phase 1.

Known problems:
- Local git still behind origin until sync checkpoint.
- PHP/Composer not on PATH (XAMPP php.exe exists).

Rollback/recovery notes:
- Delete or revert docs/ARCHITECTURE.md and this checkpoint section if needed. Frontend untouched.

Exact next task:
- Git sync (fetch, inspect HEAD..origin/main, fast-forward only if safe). Then Phase 2 backend skeleton.

Resume instructions:
- "Read docs/PROGRESS.md first."
- "Inspect git status and current diff."
- "Continue from PHASE-1-ARCHITECTURE-20260928."
- "Do NOT restart completed phases."

---

## Locked user decisions (Phase 0B answers)

Recorded 2026-09-28. These override earlier “recommendations only.”

1. Frameworkless PHP, clean layers. Composer OK for PSR-4 and necessary utilities only. No Laravel/Symfony without explicit approval.
2. Server-side PHP sessions + HttpOnly cookies; Secure/SameSite as appropriate. Regenerate session ID after login. Destroy on logout. Never localStorage as auth source of truth.
3. Admin MAY access diagnosis/prescription in v1 only with an **explicit** permission flag, not merely because role=admin. Enforce server-side. Audit sensitive access.
4. Doctors: no reports outside care/queue scope. Own associated patients only. Backend enforced.
5. Patients: own reports only.
6. Single hospital v1. No multi-branch engineering.
7. One role per account: patient / doctor / admin.
8. Seed demo accounts: one patient, required doctors, one admin. Hashed passwords only. No “any password.” Demo credentials separate from any future production credentials.
9. No SMS/email v1. In-app queue status only. Notification logic modular for later email/SMS.
10. Short polling first. Adaptive: active queue ~3–5s; reduce/pause when tab hidden; exponential backoff on failures; never overlap requests; cancel abandoned requests; lightweight/conditional responses.
11. Composer sparingly. PHP built-ins first. Composer mainly autoload or clear wins.
12. XAMPP supported for v1 local/course/demo. GitHub Pages remains static frontend. Backend portable to Apache/Nginx + PHP-FPM later.
13. Keep Frontend/README.md. Root README = whole system; Frontend/README.md = frontend-specific. Do not delete.
14. Synchronize with origin BEFORE backend work, but do **not** blindly `git pull`. Fetch, inspect, fast-forward/merge safely. Never overwrite local work, never force push, never reset --hard, never git clean -fd, never push unless asked. Do not lose untracked docs screenshots/gifs.
15. Shared authoritative server-side queue. Patient token MUST appear on the same queue the doctor dashboard uses.
16. Admin creates doctor email/account. Server-generated temporary password (not admin-chosen permanent). Store only hash. `must_change_password = true`. Force new password on first login.

Additional: Never hard-delete doctors who have historical clinical or queue records. Use `account_status` / `is_active` / `deactivated_at`. History stays linked. New bookings blocked for inactive doctors. Inactive doctors omitted from active booking lists. History remains auditable.

---

# Prior checkpoint (Phase 0) — do not rerun

Checkpoint ID: PHASE-0-FORENSIC-AUDIT-20260928
Timestamp: 2026-09-28 14:33 +06:00
Phase: 0 (Repository Forensic Audit) + 0B (User Approval Gate — questions posed, awaiting answers)
Task: Inspect-only audit of the existing frontend prototype; map architecture; list blocking decisions. No backend/PHP/API/database implementation.
Status: Phase 0 complete. Phase 0B answers recorded in PHASE-1-ARCHITECTURE-20260928.

What was completed:
- Recursive inspection of the working tree (tracked files + untracked `docs/` media).
- Read of README.md, Frontend/README.md, LICENSE, .gitignore, Backend/.gitkeep, all Frontend HTML/CSS/JS including shared modules.
- Git inspection: status, diff (empty), log, `git ls-files`, comparison to `origin/main` (local `main` is 9 commits behind; no pull performed).
- Architecture map below is from code, not from assumed trees.
- Identified demo auth weaknesses, disconnected queue simulations, mock analytics, and PHP/XAMPP gaps.
- Blocking questions collected in one list (Phase 0B). Conservative non-blocking recommendations recorded (not implemented).

Files added:
- docs/PROGRESS.md (this file)

Files modified:
- None (application source untouched)

Files removed:
- None

Database changes:
- None (no database exists)

API changes:
- None (no API exists; no `fetch()` in application JS)

Frontend changes:
- None (preserve existing frontend; audit only)

Security changes:
- None implemented. Findings documented below.

Tests/checks run:
- Manual source read of all page JS/HTML and shared modules.
- `git status`, `git diff`, `git log -5`, `git ls-files`, `git ls-tree -r origin/main`, `git log HEAD..origin/main`.
- Glob/search for PHP, package.json, composer.json, .env, SQL, Docker, CI, tests: none on local HEAD except empty `Backend/.gitkeep`. GitHub Actions workflow exists only on `origin/main`.
- Search for TODO/FIXME in application code: none in Frontend JS (TODOs not present).
- No automated test suite exists; none executed.
- No browser verification in this phase (read-only audit).

Results:
- Confirmed: static multi-page HTML/CSS/JS demo with ES modules and localStorage. Admin dashboard **does exist** at `Frontend/admin-dashboard/`. `Backend/` exists with only `.gitkeep`.
- Local clone is **behind origin/main by 9 commits** (docs screenshots/GIF + GitHub Pages workflow + README screenshot path updates). Those origin files match the untracked local `docs/gifs` and `docs/screenshots`. Frontend application files are identical between local HEAD and origin (diff is only README, docs media, `.github/workflows/static.yml`).
- No PHP, Composer, npm, SQL, Docker, or env files in the repo.

Performance observations:
- All logic is client-side. Queue “realtime” is `setInterval` (patient position every 8s; doctor fake arrivals every 18s). Chart.js loads only on admin HTML. Lucide `@latest` from unpkg on every page. Unsplash images loaded at runtime. No measured timings; none invented.

Decisions made:
- Audit-only; no implementation.
- Do not git commit this checkpoint: working tree has untracked `docs/` (gifs/screenshots) that must not be mixed into a checkpoint commit; `docs/PROGRESS.md` is the only intended new file.
- Do not pull/push.
- Do not invent endpoints, tables, credentials, tests, or metrics.

Questions requiring user approval:
- See “Phase 0B — BLOCKING QUESTIONS” below. Implementation of backend must not start until these are answered.

Known problems (prototype, verified in code):
- Demo authentication: passwords not checked or stored; admin any email/password; doctor unknown email falls back to first doctor.
- `requireRole()` is client-side redirect only; identity is editable in localStorage.
- Patient tokens and doctor queues are independent simulations (not one shared queue).
- Admin overview/analytics/reports are hardcoded mock data (`analyticsData`, `PATIENT_REPORTS`, hardcoded stat strings).
- Admin token Config tab does not persist or apply settings.
- Homepage claims notifications, HIPAA, uptime SLA; none are implemented.
- Register password is validated then discarded; login as patient always creates a new in-memory profile (no account lookup).
- `innerHTML` interpolation of user/admin-controlled strings (XSS risk if this pattern survives into a real backend).
- Local git behind origin; README screenshot filenames on local HEAD (`hero.png`, `homepage.png`, `doctors.png`) do not match actual screenshot files on origin/untracked docs.

Rollback/recovery notes:
- No application files were changed. To discard only this checkpoint: delete `docs/PROGRESS.md` if desired. Do not delete user screenshots/gifs. Git HEAD remains `a422f5a`.

Exact next task:
- Phase 0B: wait for user answers to the numbered blocking questions. After answers are recorded in a new PROGRESS.md checkpoint, proceed only then (likely Phase 1 design / API contract — not started).

Resume instructions:
- "Read docs/PROGRESS.md first."
- "Inspect git status and current diff."
- "Continue from PHASE-0-FORENSIC-AUDIT-20260928."
- "Do NOT restart completed phases."

---

## Internal architecture map (verified)

### Git / workspace notes

- Branch: `main`, tracking `origin/main`, **behind 9 commits** (fast-forward possible; not performed).
- Local HEAD: `a422f5a` — “Initial commit: MedQueue hospital queue management demo.”
- Untracked: entire `docs/` folder (gifs + screenshots + this PROGRESS.md). Origin already contains the same media files; local copies appear to be the user’s copies of those docs, not a second tree of app code.
- `.gitignore` ignores `.env`, keys, `node_modules/`, editor junk. No secrets found in tracked files.
- LICENSE: MIT, Copyright (c) 2026 Mahim.

### Actual tree (local working tree, verified)

```
Project 2.0/
├── .git/
├── .gitignore
├── LICENSE
├── README.md
├── Backend/
│   └── .gitkeep                 # empty placeholder; no PHP
├── Frontend/
│   ├── index.html               # redirect to homepage
│   ├── README.md
│   ├── admin-dashboard/         # EXISTS (html, css, js)
│   ├── doctor-dashboard/
│   ├── doctors/
│   ├── homepage/
│   ├── hospital-info/
│   ├── login/
│   ├── patient-dashboard/
│   ├── register/
│   └── shared/
│       ├── data.js
│       ├── doctorCard.js
│       ├── icons.js
│       ├── nav.js
│       ├── store.js
│       ├── style.css
│       ├── tilt.js
│       └── ui.js
└── docs/                        # untracked locally; also on origin/main
    ├── PROGRESS.md              # this checkpoint
    ├── gifs/landing-page.gif
    └── screenshots/
        ├── admin-dashboard.png
        ├── admin-patient-report.png
        ├── admin-queue-analytics.png
        ├── doctor-dashboard.png
        ├── doctor-directory.png
        ├── doctor-history.png
        ├── hospital-info.png
        ├── patient-dashboard.png
        └── patient-token-queue.png
```

**Present on origin/main but not on local HEAD:** `.github/workflows/static.yml` (GitHub Pages deploy of `./Frontend`), README screenshot/docs updates, the `docs/` media listed above.

**Does not exist anywhere inspected:** `package.json`, `composer.json`, `.env`, SQL dumps, Docker, PHP sources, test suites, WebSocket/SSE code, `fetch()` API client.

### Page map and routes/links

All paths relative to `Frontend/`. Multi-page full reloads. Nav built in `shared/nav.js`.

| Page | File | Who | How reached |
|------|------|-----|-------------|
| Entry | `index.html` | Public | meta refresh + `location.replace` → `homepage/homepage.html` |
| Homepage | `homepage/homepage.html` | Public | Brand link; logout destination |
| Doctors | `doctors/doctors.html` | Public + patient nav | Nav “Doctors”; homepage CTAs |
| Hospital Info | `hospital-info/hospital-info.html` | Public + patient nav | Nav; homepage “Learn More” |
| Login | `login/login.html` | Public | Nav; register footer; `requireRole` redirect |
| Register | `register/register.html` | Public | Nav; login footer; homepage “Get Started”; Doctors “Get Token” if not a logged-in patient |
| Patient Dashboard | `patient-dashboard/patient-dashboard.html` | Patient (`requireRole("patient")`) | Nav “My Queue”; login; register; pending-doctor handoff |
| Doctor Dashboard | `doctor-dashboard/doctor-dashboard.html` | Doctor | Nav “My Dashboard”; doctor login |
| Admin Dashboard | `admin-dashboard/admin-dashboard.html` | Admin | Nav “Admin Panel”; admin login |

Guest nav: Doctors, Hospital Info, Log in, Register.  
Patient nav: those plus My Queue.  
Doctor nav: My Dashboard only.  
Admin nav: Admin Panel only.

Doctors “Get Token”: if `getUser().role === "patient"`, writes `medqueue.pendingDoctorId` and navigates to patient dashboard; else Register (not Login).

### Shared modules

| Module | Role |
|--------|------|
| `store.js` | localStorage JSON I/O; user/doctors/specialties/tokens/sessions; `requireRole()` |
| `data.js` | Seed doctors, specialties, `DOCTOR_EMAILS`, token prefixes, name pool, `buildDoctorQueue()`, `analyticsData`, `PATIENT_REPORTS`, Unsplash photo IDs |
| `nav.js` | Role-aware top nav, mobile menu, logout (`clearUser` → homepage) |
| `ui.js` | `btn`, `badge`, `cyanGlow` HTML strings |
| `doctorCard.js` | Doctor card (Unsplash `images.unsplash.com/{photoId}`) |
| `icons.js` | Lucide `<i data-lucide>` + `refreshIcons()` |
| `tilt.js` | Hover tilt + homepage parallax; respects `prefers-reduced-motion` |
| `style.css` | Design tokens and shared components |

Page CSS files are page-specific overlays.

### All localStorage keys

Defined in `Frontend/shared/store.js` `KEYS`:

| Key | Shape / meaning |
|-----|-----------------|
| `medqueue.user` | `{ role: "patient"\|"doctor"\|"admin", profile: { name, email, phone, condition, patientId, joinedDate, doctorId? } }` |
| `medqueue.doctors` | `Doctor[]` — seeded from `INITIAL_DOCTORS` on first `getDoctors()`; mutated by admin CRUD |
| `medqueue.specialties` | `string[]` — seeded from `SPECIALTIES`; admin add/rename/remove |
| `medqueue.pendingDoctorId` | doctor id string for Doctors → Patient Dashboard auto-book; cleared after use |
| `medqueue.patientTokens` | `QueueToken[]` for the **browser’s** patient simulation (not per-user server records) |
| `medqueue.doctorSession` | `{ [doctorId]: { queue, activeTab, available, sessionHistory, nextTokenNum, settingsDraft } }` |

`PATIENT_REPORTS` and `analyticsData` are **not** stored; they are constants in `data.js`. Passwords are **not** stored. Config tab values are **not** stored.

### Auth / role model as coded

- Three roles chosen by login **tab**, not by server account type.
- **Patient login** (`Frontend/login/login.js`): requires name, email, non-empty password. Password unused after the empty check. Profile generated with random `PAT-####`. No lookup of prior register.
- **Register** (`Frontend/register/register.js`): two steps; email/phone/password length client-validated; password discarded; `setUser("patient", profile)` then patient dashboard. Copy claims “encrypted and only visible to treating physician” — false in this prototype (plain localStorage + displayed on patient dashboard profile strip).
- **Doctor login**: email mapped via `DOCTOR_EMAILS` (hardcoded hospital emails). If email not in map: **`doctors[0].id`**. Any non-empty password accepted. Profile includes `doctorId`.
- **Admin login**: any email + any non-empty password; profile name always `"Admin"`.
- **Guards**: `requireRole(...)` in store.js: if missing user or wrong role, `location.href = "../login/login.html"`. No tokens, cookies, or server session. Anyone can `localStorage.setItem("medqueue.user", ...)`.
- One account / multiple roles: **not implemented**. Role is whatever tab was used last.
- Logout: `clearUser()` only (does not clear doctors/tokens/sessions).

### Queue / token simulation

**Patient** (`patient-dashboard.js`):
- Flow: specialty → available doctors → 2s “generating” delay → token with `position = doctor.queueCount + 1 + existing tokens for that doctor`.
- Tracking: every 8 seconds decrement `position` of `waiting` tokens (floor 1). Never auto-completes; cancel removes token.
- History table is the same token list, dates = “today”.
- Does **not** write into `medqueue.doctorSession`.

**Doctor** (`doctor-dashboard.js`):
- Session restored per `doctorId` or seeded with `buildDoctorQueue(doctor)` (fake names from `PATIENT_NAME_POOL`).
- Call / complete / skip / emergency reorder. Completions go to `sessionHistory`.
- If `session.available`, every 18s append a **random-name** waiting token. Toggle availability stops that interval.
- Settings times saved on session object only; do not drive hospital hours or public doctor `available` flag.
- Doctor `available` in session is separate from admin-edited `doctors[].available`.

README already states these queues are independent. Confirmed in code.

### Admin capabilities as coded

Tabs: overview, doctors, specialties, reports, config, analytics (`admin-dashboard.js`).

- **Overview:** hardcoded “284 / 14 min / 341” etc.; “Active Doctors” from live doctor list; charts from `analyticsData`.
- **Doctors:** add/edit/remove, photo Unsplash ID/URL, availability, avg wait. New id `d${Date.now()}`. No login email created for new doctors (`DOCTOR_EMAILS` unchanged).
- **Specialties:** add/rename (updates doctors’ specialty string)/remove. Remove does not reassign doctors.
- **Reports:** all seeded `PATIENT_REPORTS` (diagnosis, prescription, follow-up). Filter by doctor. Expand + `window.print()`.
- **Config:** inputs with defaults; Save button has **no** `data-action` — display only.
- **Analytics:** mock wait/volume charts; “Doctor Performance Today” completed count = count of seeded reports for that doctor, not live queue.
- **Export PDF:** `window.print()`.

### Reports / analytics: mock vs real

| Surface | Real persisted data? |
|---------|----------------------|
| Admin reports | No — `PATIENT_REPORTS` in `data.js` |
| Admin charts / overview numbers | No — `analyticsData` + hardcoded strings |
| Doctor history | Mix: session completions + seeded reports filtered by `doctorId` (name/time/duration only, not full clinical text) |
| Patient history | Only local tokens |
| Homepage stats | Animated fake counters (48200 patients, 127 doctors, 99.5% uptime, 68% wait reduced) |
| Hospital info | Static arrays in `hospital-info.js` (one hospital: New Delhi address, placeholder phones) |

### External dependencies

- Google Fonts: Plus Jakarta Sans, Inter (`fonts.googleapis.com`)
- Lucide UMD `@latest` from `unpkg.com` (every page)
- Chart.js 4 UMD from `cdn.jsdelivr.net` (admin dashboard HTML only)
- Unsplash `https://images.unsplash.com/{photo-id}?w=...` (doctor photos)
- GitHub Pages workflow on origin: deploy `./Frontend` as static site (no PHP)

No npm/Composer lockfiles. Internet required for fonts/icons/charts/photos.

### Gaps vs PHP / XAMPP target

| Target typically needs | Current repo |
|------------------------|--------------|
| Apache + PHP | Empty `Backend/` |
| MySQL/MariaDB schema | None |
| Composer | None |
| Session login + hashed passwords | localStorage; passwords discarded |
| Shared queue DB | Two independent client simulations |
| REST or form posts | Zero `fetch`; no forms hitting a server |
| Real reports | Seeded arrays |
| SMS/email | Marketing copy only |
| Multi-hospital | Single hardcoded hospital |
| Tests/CI for PHP | None; Pages CI on origin for static Frontend only |
| Secrets / `.env` | gitignored pattern only; no file |

---

## Conservative non-blocking engineering recommendations (proposal only)

Not implemented. Use unless the user overrides:

- Frameworkless PHP (plain PHP under `Backend/` served by XAMPP), not Laravel/Symfony, unless the user later asks for a framework.
- JSON API consumed by the existing ES-module frontend (preserve page folders); PDO + prepared statements; Argon2id (`PASSWORD_ARGON2ID`) if PHP build supports it, else `PASSWORD_DEFAULT`.
- Server sessions with HttpOnly, Secure (when HTTPS), SameSite cookies — not JWTs in localStorage for this course-sized app.
- CSRF tokens on cookie-authenticated mutating routes.
- Escape output / stop interpolating untrusted strings into `innerHTML`.
- Do not treat homepage HIPAA/SLA/notification claims as requirements unless the user confirms.

---

## Phase 0B — BLOCKING QUESTIONS

Numbered list is also in the parent-facing report. Do not implement until answered.

1. PHP style: frameworkless vs Laravel/other?
2. Auth: PHP sessions/cookies vs API tokens?
3. May admin read full medical reports?
4. May doctors read reports for patients they did not treat?
5. May patients see their own medical reports in the app?
6. Multiple hospital branches in v1?
7. One login, multiple roles?
8. Seeded demo accounts (patient/doctor/admin) in the database?
9. SMS/email notifications in this course version?
10. Queue updates: polling vs SSE (WebSockets not currently in the codebase)?
11. Composer dependencies allowed?
12. Scope: local XAMPP only, or also production hosting?
13. Keep `Frontend/README.md` as a separate file vs merge into root README (do not delete without confirmation)?
14. Fast-forward/pull the 9 origin commits (docs + GitHub Pages) before backend work?
15. Should patient-booked tokens and the doctor live queue become **one** shared queue in the backend (they are disconnected today)?
16. New doctors added by admin: how do they log in (email mapping is hardcoded today)?
