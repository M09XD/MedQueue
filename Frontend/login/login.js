import { icon, refreshIcons } from "../shared/icons.js";
import { btn, cyanGlow } from "../shared/ui.js";
import { setUser } from "../shared/store.js";
import { mountNav } from "../shared/nav.js";
import { apiFetch, ensureCsrfToken } from "../shared/api.js";

mountNav("login");

let roleHint = "patient";
let error = "";
let loading = false;
let draft = { email: "", pass: "" };

function captureDraft() {
  const emailEl = document.getElementById("login-email");
  const passEl = document.getElementById("login-pass");
  if (emailEl) draft.email = emailEl.value;
  if (passEl) draft.pass = passEl.value;
}

function destinationForRole(role) {
  if (role === "doctor") return "../doctor-dashboard/doctor-dashboard.html";
  if (role === "admin") return "../admin-dashboard/admin-dashboard.html";
  return "../patient-dashboard/patient-dashboard.html";
}

function render() {
  const roleButtons = ["patient", "doctor", "admin"]
    .map((r) => `<button type="button" class="${roleHint === r ? "active" : ""}" data-action="set-role" data-role="${r}">${r}</button>`)
    .join("");

  const roleHintText =
    roleHint === "doctor"
      ? `<div class="auth-hint"><span class="cyan-text" style="font-weight:500;">Doctor login:</span> use your hospital account credentials.</div>`
      : roleHint === "admin"
        ? `<div class="auth-hint"><span class="cyan-text" style="font-weight:500;">Admin login:</span> sign in with the seeded admin account or your admin credentials.</div>`
        : "";

  document.getElementById("page-root").innerHTML = `
    <div class="auth-wrap">
      <div class="auth-box">
        <div class="auth-card">
          ${cyanGlow("auth-glow")}
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-sub">Sign in to access your dashboard</p>

          <div class="role-switch">${roleButtons}</div>
          ${roleHintText}

          <form data-form="login" novalidate>
            <div class="field">
              <label class="label" for="login-email">Email</label>
              <input class="input" id="login-email" type="email" value="${draft.email}" placeholder="you@example.com" ${loading ? "disabled" : ""} />
            </div>
            <div class="field">
              <label class="label" for="login-pass">Password</label>
              <input class="input" id="login-pass" type="password" value="${draft.pass}" placeholder="••••••••" ${loading ? "disabled" : ""} />
            </div>
            ${error ? `<p class="error-banner" role="alert">${icon("alert-triangle", "ic-sm")} ${error}</p>` : ""}
            ${btn({ label: loading ? `${icon("loader", "ic-sm")} Signing in...` : "Sign In", variant: "primary", size: "lg", block: true, type: "submit", attrs: loading ? "disabled" : "" })}
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
  if (!el || el.dataset.action !== "set-role" || loading) return;
  captureDraft();
  roleHint = el.dataset.role;
  error = "";
  render();
});

document.getElementById("page-root").addEventListener("submit", async (e) => {
  const form = e.target.closest('[data-form="login"]');
  if (!form || loading) return;
  e.preventDefault();
  captureDraft();

  const { email, pass } = draft;
  if (!email || !pass) {
    error = "Please fill in email and password.";
    render();
    return;
  }

  loading = true;
  error = "";
  render();

  try {
    await ensureCsrfToken();
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password: pass },
    });

    const user = response.data?.user;
    if (!user) throw new Error('Login response missing user payload.');

    if (roleHint && roleHint !== user.role) {
      error = `Signed in as ${user.role}. Redirecting to the correct dashboard.`;
    }

    setUser(user.role, {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      condition: "",
      patientId: user.role === "patient" ? `PAT-${String(user.id).padStart(4, "0")}` : "",
      joinedDate: new Date(user.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      doctorId: user.role === "doctor" ? user.id : undefined,
      userId: user.id,
    });

    loading = false;
    render();
    setTimeout(() => {
      location.href = destinationForRole(user.role);
    }, 250);
  } catch (err) {
    loading = false;
    error = err?.message || "Unable to sign in.";
    render();
  }
});

render();
