import { getUser, clearUser } from "./store.js";
import { icon, refreshIcons } from "./icons.js";
import { badge, btn } from "./ui.js";
import { apiFetch } from "./api.js";

const GUEST_LINKS = [
  { label: "Doctors", href: "../doctors/doctors.html", key: "doctors" },
  { label: "Hospital Info", href: "../hospital-info/hospital-info.html", key: "hospital-info" },
];
const ROLE_LINKS = {
  patient: [{ label: "My Queue", href: "../patient-dashboard/patient-dashboard.html", key: "patient-dashboard" }],
  doctor: [{ label: "My Dashboard", href: "../doctor-dashboard/doctor-dashboard.html", key: "doctor-dashboard" }],
  admin: [{ label: "Admin Panel", href: "../admin-dashboard/admin-dashboard.html", key: "admin-dashboard" }],
};

function linksForRole(role) {
  if (role === "doctor" || role === "admin") return ROLE_LINKS[role];
  if (role === "patient") return [...GUEST_LINKS, ...ROLE_LINKS.patient];
  return GUEST_LINKS;
}

export function mountNav(currentPageKey) {
  const root = document.getElementById("nav-root");
  let mobileOpen = false;
  let loggingOut = false;

  function draw() {
    const stored = getUser();
    const role = stored?.role || null;
    const items = linksForRole(role);

    const linkTag = (l, cls) =>
      `<a class="${cls} ${currentPageKey === l.key ? "active" : ""}" href="${l.href}">${l.label}</a>`;

    const desktopAuth = role
      ? `${badge(role, "default")}
         ${btn({ label: loggingOut ? "Logging out..." : `${icon("log-out", "ic-base")} Log out`, variant: "ghost", size: "sm", attrs: loggingOut ? "disabled" : 'data-nav-action="logout"' })}`
      : `${btn({ label: `${icon("log-in", "ic-base")} Log in`, variant: "ghost", size: "sm", href: "../login/login.html" })}
         ${btn({ label: "Register", variant: "primary", size: "sm", href: "../register/register.html" })}`;

    const mobileAuth = role
      ? btn({ label: loggingOut ? "Logging out..." : `${icon("log-out", "ic-base")} Log out`, variant: "ghost", size: "sm", block: true, attrs: loggingOut ? "disabled" : 'data-nav-action="logout"' })
      : `${btn({ label: "Log in", variant: "ghost", size: "sm", block: true, href: "../login/login.html" })}
         ${btn({ label: "Register", variant: "primary", size: "sm", block: true, href: "../register/register.html" })}`;

    root.innerHTML = `
      <nav class="nav">
        <div class="nav-row">
          <a class="brand" href="../homepage/homepage.html">
            <span class="brand-mark">${icon("activity", "ic-sm", "cyan-text")}</span>
            <span class="brand-name">MedQueue</span>
          </a>

          <div class="nav-links">${items.map((l) => linkTag(l, "nav-link")).join("")}</div>
          <div class="nav-actions">${desktopAuth}</div>

          <button class="nav-burger" data-nav-action="toggle-mobile" aria-label="${mobileOpen ? "Close menu" : "Open menu"}">
            ${icon(mobileOpen ? "x" : "menu", "ic-md")}
          </button>
        </div>

        ${
          mobileOpen
            ? `<div class="nav-mobile">
                 ${items.map((l) => linkTag(l, "nav-mobile-link")).join("")}
                 <div class="nav-mobile-actions">${mobileAuth}</div>
               </div>`
            : ""
        }
      </nav>
    `;
    refreshIcons();
  }

  root.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-nav-action]");
    if (!el) return;

    if (el.dataset.navAction === "logout" && !loggingOut) {
      loggingOut = true;
      draw();
      try {
        await apiFetch('/auth/logout', { method: 'POST', body: {} });
      } catch {
        // local logout still proceeds even if backend request fails
      }
      clearUser();
      location.href = "../homepage/homepage.html";
    } else if (el.dataset.navAction === "toggle-mobile") {
      mobileOpen = !mobileOpen;
      draw();
    }
  });

  draw();
}
