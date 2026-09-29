import { icon, refreshIcons } from "../shared/icons.js";
import { btn, cyanGlow, esc } from "../shared/ui.js";
import { login, logout, changePassword } from "../shared/api.js";
import { mountNav } from "../shared/nav.js";

mountNav("login");

const DESTINATIONS = {
  patient: "../patient-dashboard/patient-dashboard.html",
  doctor: "../doctor-dashboard/doctor-dashboard.html",
  admin: "../admin-dashboard/admin-dashboard.html",
};

let role = "patient";
let mode = "login"; // login | change-password
let error = "";
let busy = false;
let draft = { email: "", pass: "" };
let pendingUser = null;

function captureDraft() {
  const emailEl = document.getElementById("login-email");
  const passEl = document.getElementById("login-pass");
  if (emailEl) draft.email = emailEl.value;
  if (passEl) draft.pass = passEl.value;
}

function loginForm() {
  const roleButtons = ["patient", "doctor", "admin"]
    .map((r) => `<button type="button" class="${role === r ? "active" : ""}" data-action="set-role" data-role="${r}">${r}</button>`)
    .join("");
  return `
    <h1 class="auth-title">Welcome back</h1>
    <p class="auth-sub">Sign in to access your dashboard</p>
    <div class="role-switch">${roleButtons}</div>
    <form data-form="login" novalidate>
      ${
        role === "doctor"
          ? `<div class="auth-hint"><span class="cyan-text" style="font-weight:500;">Doctor login:</span> use the hospital email your administrator created for you. New accounts start with a temporary password you must change on first sign-in.</div>`
          : ""
      }
      <div class="field">
        <label class="label" for="login-email">Email</label>
        <input class="input" id="login-email" type="email" autocomplete="username" value="${esc(draft.email)}" placeholder="you@example.com" />
      </div>
      <div class="field">
        <label class="label" for="login-pass">Password</label>
        <input class="input" id="login-pass" type="password" autocomplete="current-password" value="${esc(draft.pass)}" placeholder="••••••••" />
      </div>
      ${error ? `<p class="error-banner" role="alert">${icon("alert-triangle", "ic-sm")} ${esc(error)}</p>` : ""}
      ${btn({ label: busy ? "Signing in…" : "Sign In", variant: "primary", size: "lg", block: true, type: "submit", disabled: busy })}
    </form>
    <p class="auth-footer">No account? <a class="link-btn" href="../register/register.html">Register here</a></p>`;
}

function changeForm() {
  return `
    <h1 class="auth-title">Set a new password</h1>
    <p class="auth-sub">Your account uses a temporary password. Choose your own to continue.</p>
    <form data-form="change" novalidate>
      <div class="field">
        <label class="label" for="new-pass">New password</label>
        <input class="input" id="new-pass" type="password" autocomplete="new-password" placeholder="At least 8 characters" />
      </div>
      <div class="field">
        <label class="label" for="new-pass2">Repeat new password</label>
        <input class="input" id="new-pass2" type="password" autocomplete="new-password" />
      </div>
      ${error ? `<p class="error-banner" role="alert">${icon("alert-triangle", "ic-sm")} ${esc(error)}</p>` : ""}
      ${btn({ label: busy ? "Saving…" : "Save and continue", variant: "primary", size: "lg", block: true, type: "submit", disabled: busy })}
    </form>`;
}

function render() {
  document.getElementById("page-root").innerHTML = `
    <div class="auth-wrap"><div class="auth-box"><div class="auth-card">
      ${cyanGlow("auth-glow")}
      ${mode === "login" ? loginForm() : changeForm()}
    </div></div></div>`;
  refreshIcons();
}

const root = document.getElementById("page-root");

root.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.dataset.action !== "set-role") return;
  captureDraft();
  role = el.dataset.role;
  error = "";
  render();
});

root.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-form]");
  if (!form) return;
  e.preventDefault();
  if (busy) return;
  error = "";

  if (form.dataset.form === "login") {
    captureDraft();
    if (!draft.email.trim() || !draft.pass) {
      error = "Please fill in all fields.";
      return render();
    }
    busy = true;
    render();
    try {
      const user = await login(draft.email.trim(), draft.pass);
      if (user.role !== role) {
        // The account is real but the wrong tab was chosen: end that session instead of leaving it open.
        await logout();
        busy = false;
        error = `This account is a ${user.role} account. Please switch to the "${user.role}" tab.`;
        return render();
      }
      if (user.mustChangePassword) {
        pendingUser = user;
        mode = "change-password";
        busy = false;
        return render();
      }
      location.href = DESTINATIONS[user.role] || "../homepage/homepage.html";
    } catch (err) {
      busy = false;
      error = err.message || "Login failed.";
      render();
    }
  } else {
    const p1 = document.getElementById("new-pass").value;
    const p2 = document.getElementById("new-pass2").value;
    if (p1.length < 8) { error = "Password must be at least 8 characters."; return render(); }
    if (p1 !== p2) { error = "The two passwords do not match."; return render(); }
    busy = true;
    render();
    try {
      await changePassword(draft.pass, p1);
      location.href = DESTINATIONS[pendingUser.role];
    } catch (err) {
      busy = false;
      error = err.message || "Could not change the password.";
      render();
    }
  }
});

render();
