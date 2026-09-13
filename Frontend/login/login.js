import { icon, refreshIcons } from "../shared/icons.js";
import { btn, cyanGlow } from "../shared/ui.js";
import { DOCTOR_EMAILS } from "../shared/data.js";
import { getDoctors, setUser } from "../shared/store.js";
import { mountNav } from "../shared/nav.js";

mountNav("login");

let role = "patient";
let error = "";
let draft = { email: "", name: "", pass: "" };

function captureDraft() {
  const nameEl = document.getElementById("login-name");
  const emailEl = document.getElementById("login-email");
  const passEl = document.getElementById("login-pass");
  if (nameEl) draft.name = nameEl.value;
  if (emailEl) draft.email = emailEl.value;
  if (passEl) draft.pass = passEl.value;
}

function render() {
  const roleButtons = ["patient", "doctor", "admin"]
    .map((r) => `<button class="${role === r ? "active" : ""}" data-action="set-role" data-role="${r}">${r}</button>`)
    .join("");

  document.getElementById("page-root").innerHTML = `
    <div class="auth-wrap">
      <div class="auth-box">
        <div class="auth-card">
          ${cyanGlow("auth-glow")}
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-sub">Sign in to access your dashboard</p>

          <div class="role-switch">${roleButtons}</div>

          <form data-form="login" novalidate>
            ${
              role === "patient"
                ? `<div class="field">
                     <label class="label" for="login-name">Full Name</label>
                     <input class="input" id="login-name" type="text" value="${draft.name}" placeholder="Your full name" />
                   </div>`
                : ""
            }
            ${
              role === "doctor"
                ? `<div class="auth-hint">
                     <span class="cyan-text" style="font-weight:500;">Doctor login:</span> Use your hospital email (e.g.
                     <span class="mono">sarah.chen@medqueue.hospital</span>). Your profile is identified automatically.
                   </div>`
                : ""
            }
            <div class="field">
              <label class="label" for="login-email">Email</label>
              <input class="input" id="login-email" type="email" value="${draft.email}" placeholder="you@example.com" />
            </div>
            <div class="field">
              <label class="label" for="login-pass">Password</label>
              <input class="input" id="login-pass" type="password" value="${draft.pass}" placeholder="••••••••" />
            </div>
            ${error ? `<p class="error-banner" role="alert">${icon("alert-triangle", "ic-sm")} ${error}</p>` : ""}
            ${btn({ label: "Sign In", variant: "primary", size: "lg", block: true, type: "submit" })}
          </form>

          <p class="auth-footer">
            No account? <a class="link-btn" href="../register/register.html">Register here</a>
          </p>
        </div>
      </div>
    </div>
  `;
  refreshIcons();
}

document.getElementById("page-root").addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.dataset.action !== "set-role") return;
  captureDraft();
  role = el.dataset.role;
  error = "";
  render();
});

document.getElementById("page-root").addEventListener("submit", (e) => {
  const form = e.target.closest('[data-form="login"]');
  if (!form) return;
  e.preventDefault();
  captureDraft();

  const { email, name, pass } = draft;
  if (!email || !pass) { error = "Please fill in all fields."; render(); return; }
  if (role === "patient" && !name.trim()) { error = "Please enter your name."; render(); return; }

  const doctors = getDoctors();
  let profile;
  let destination;

  if (role === "patient") {
    profile = {
      name: name.trim(), email, phone: "", condition: "",
      patientId: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
      joinedDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    };
    destination = "../patient-dashboard/patient-dashboard.html";
  } else if (role === "doctor") {
    const doctorId = DOCTOR_EMAILS[email.toLowerCase().trim()] ?? doctors[0].id;
    const doc = doctors.find((d) => d.id === doctorId) ?? doctors[0];
    profile = { name: doc.name, email, phone: "", condition: "", patientId: "", joinedDate: "", doctorId: doc.id };
    destination = "../doctor-dashboard/doctor-dashboard.html";
  } else {
    profile = { name: "Admin", email, phone: "", condition: "", patientId: "", joinedDate: "" };
    destination = "../admin-dashboard/admin-dashboard.html";
  }

  setUser(role, profile);
  location.href = destination;
});

render();
