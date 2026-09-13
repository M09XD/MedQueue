# MedQueue — Plain HTML/CSS/JS, one folder per page

Each page of the app is a real, separate HTML file with its own CSS and
JS file, grouped in its own folder — no React, no TypeScript, no
Tailwind, no build step.

## Folder structure

```
index.html                     redirects to homepage/homepage.html

homepage/
  homepage.html
  homepage.css
  homepage.js

doctors/
  doctors.html
  doctors.css
  doctors.js

hospital-info/
  hospital-info.html
  hospital-info.css
  hospital-info.js

login/
  login.html
  login.css
  login.js

register/
  register.html
  register.css
  register.js

patient-dashboard/
  patient-dashboard.html
  patient-dashboard.css
  patient-dashboard.js

doctor-dashboard/
  doctor-dashboard.html
  doctor-dashboard.css
  doctor-dashboard.js

admin-dashboard/
  admin-dashboard.html
  admin-dashboard.css
  admin-dashboard.js

shared/
  style.css        the design system (colors, buttons, cards, nav, forms...)
  data.js           seed data (doctors, specialties, reports, analytics)
  store.js          saves/loads app data via localStorage (see below)
  nav.js            the top navigation bar, used on every page
  ui.js             tiny button/badge builders, used on every page
  doctorCard.js     the doctor card, used on 3 pages
  tilt.js           the mouse-tilt hover effect
  icons.js          small helper around the Lucide icon library
```

Every page you asked for — Homepage, Doctors, Hospital Info, Login,
Register, Patient Dashboard, Doctor Dashboard, Admin Dashboard — is its
own folder with its own 3 files, exactly like you described
(`homepage/homepage.html`, `homepage/homepage.css`, `homepage/homepage.js`).

### Why there's also a `shared/` folder

A few things are genuinely used by more than one page — the color
scheme, the nav bar, the "doctor card" that appears on 3 different
pages, the list of doctors itself. Copy-pasting those into all 8 folders
would mean editing 8 files every time you wanted to change one button
color, which works against "keep it simple." So `shared/` holds only
what's truly common, and every page's own folder holds everything
specific to that page. Each page's `.css` file has a comment at the top
listing exactly what it contains.

## Real pages, real navigation

This is a genuine **multi-page site** — clicking "Doctors" in the nav
takes you to the real URL `doctors/doctors.html`, a full page load, not
a JavaScript trick pretending to be one page. Every nav link, "Log in"
button, "Register" link, etc. is a plain `<a href="...">` you could
right-click and open in a new tab.

## How pages remember things between each other

Because every page is a separate HTML file, a plain JavaScript variable
can't survive from one page to the next — the browser throws it away on
every navigation. `shared/store.js` uses `localStorage` (a small built-in
browser feature, not a library) to keep a few things around:

- who's logged in
- the doctor list (so Admin's edits show up on the Doctors page too)
- the specialty list
- a patient's active queue token (so refreshing the page doesn't lose it)
- a doctor's in-progress queue for their shift (so navigating away and
  back continues where they left off)

This is the same idea as a "remember me" cookie, just simpler — it's
plain `localStorage.setItem` / `getItem` under the hood, nothing fancier.

## Running it

Because pages use native ES modules (`<script type="module">`), open
this with a local server rather than double-clicking the HTML files —
browsers block modules from loading over `file://`:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (VS Code's "Live Server" extension, `npx serve`,
etc.) — nothing to install or build.

## What was tested

I drove the site through a real headless browser, clicking through the
actual URLs (not simulated navigation): booking a token and reloading
the page mid-track to confirm it survives a real refresh, logging in as
a doctor and calling/completing a patient, then leaving the page and
coming back to confirm the shift continued where it left off, the full
Admin CRUD for doctors and specialties (with a reload after each to
confirm it's actually saved), confirming a doctor Admin adds shows up
live on the public Doctors page, unauthenticated visits to a dashboard
correctly redirecting to Login, mobile nav, and form validation errors.
35 checks total, all passing, no console errors.

## A couple of intentional differences from the original

- **The doctor list is shared across the whole site** (via `localStorage`)
  instead of each page having its own frozen copy — this is the same
  choice explained in the single-page version's README: it means Admin's
  edits actually show up for patients, which is strictly more useful and
  changes no feature.
- **Icons (Lucide) and charts (Chart.js) load from a CDN** `<script>` tag
  each — the only two external dependencies, since there's no bundler to
  package them locally. Both are optional/defensive: if they fail to
  load, the app still works, just without icon glyphs or the analytics
  charts.
