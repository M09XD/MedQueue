import { icon, refreshIcons } from "../shared/icons.js";
import { btn, cyanGlow, esc } from "../shared/ui.js";
import { register } from "../shared/api.js";
import { mountNav } from "../shared/nav.js";

mountNav("register");

let step = 1;
let form = { name: "", email: "", phone: "", pass: "", condition: "" };
let errors = {};
let submitError = "";
let busy = false;

function captureStep1() {
  ["name", "email", "phone", "pass"].forEach((id) => {
    const el = document.getElementById(`reg-${id}`);
    if (el) form[id] = el.value;
  });
}
function captureCondition() {
  const el = document.getElementById("reg-condition");
  if (el) form.condition = el.value;
}
function validate() {
  const e = {};
  if (!form.name.trim()) e.name = "Name is required";
  if (!form.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) e.email = "Valid email required";
  if (!form.phone.match(/^\+?[\d\s\-]{7,}$/)) e.phone = "Valid phone required";
  if (form.pass.length < 8) e.pass = "Minimum 8 characters";
  errors = e;
  return Object.keys(e).length === 0;
}

function field(id, label, type, placeholder, autocomplete) {
  const err = errors[id];
  return `
    <div class="field">
      <label class="label" for="reg-${id}">${label}</label>
      <input class="input ${err ? "input-error" : ""}" id="reg-${id}" type="${type}" autocomplete="${autocomplete}" value="${esc(form[id])}" placeholder="${esc(placeholder)}" />
      ${err ? `<p class="error-text" role="alert">${esc(err)}</p>` : ""}
    </div>`;
}

function render() {
  const stepBody =
    step === 1
      ? `
        ${field("name", "Full Name", "text", "Fatima Al-Rashid", "name")}
        ${field("email", "Email", "email", "fatima@example.com", "email")}
        ${field("phone", "Phone Number", "tel", "+880 1XXX-XXXXXX", "tel")}
        ${field("pass", "Password", "password", "At least 8 characters", "new-password")}
        ${btn({ label: `Continue ${icon("chevron-right", "ic-sm")}`, variant: "primary", size: "lg", block: true, attrs: 'data-action="next"' })}`
      : `
        <div class="field">
          <label class="label" for="reg-condition">Medical Condition <span class="faint" style="font-weight:400;">(optional)</span></label>
          <textarea class="input" id="reg-condition" rows="3" maxlength="1000" placeholder="Briefly describe any existing condition or reason for visit...">${esc(form.condition)}</textarea>
        </div>
        <p class="xs faint">Optional. Share only what you are comfortable with; it is shown on your own dashboard.</p>
        ${submitError ? `<p class="error-banner" role="alert">${icon("alert-triangle", "ic-sm")} ${esc(submitError)}</p>` : ""}
        ${btn({ label: busy ? "Creating account…" : `${icon("user-check", "ic-sm")} Create Account`, variant: "primary", size: "lg", block: true, type: "submit", disabled: busy })}
        ${btn({ label: "← Back", variant: "ghost", size: "md", block: true, attrs: 'data-action="back"' })}`;

  document.getElementById("page-root").innerHTML = `
    <div class="auth-wrap" style="padding-top: 5rem; padding-bottom: 2rem;">
      <div class="auth-box"><div class="auth-card">
        ${cyanGlow("auth-glow")}
        <div class="progress-steps"><div class="seg ${step >= 1 ? "done" : ""}"></div><div class="seg ${step >= 2 ? "done" : ""}"></div></div>
        <h1 class="auth-title">${step === 1 ? "Create your account" : "Medical details"}</h1>
        <p class="auth-sub">${step === 1 ? "Step 1 of 2 — Basic information" : "Step 2 of 2 — Optional medical info"}</p>
        <form data-form="register" novalidate>${stepBody}</form>
        <p class="auth-footer">Already have an account? <a class="link-btn" href="../login/login.html">Sign in</a></p>
      </div></div>
    </div>`;
  refreshIcons();
}

const root = document.getElementById("page-root");

root.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (el.dataset.action === "next") {
    captureStep1();
    if (validate()) step = 2;
    render();
  } else if (el.dataset.action === "back") {
    captureCondition();
    step = 1;
    render();
  }
});

root.addEventListener("submit", async (e) => {
  if (!e.target.closest('[data-form="register"]')) return;
  e.preventDefault();
  if (step === 1) { // Enter pressed on step 1 behaves like "Continue"
    captureStep1();
    if (validate()) step = 2;
    return render();
  }
  if (busy) return;
  captureCondition();
  submitError = "";
  busy = true;
  render();
  try {
    await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.pass, condition: form.condition.trim() || null });
    location.href = "../patient-dashboard/patient-dashboard.html";
  } catch (err) {
    busy = false;
    if (err.details && Object.keys(err.details).length) {
      errors = err.details;
      step = 1;
    } else if (err.code === "EMAIL_EXISTS") {
      errors = { email: err.message };
      step = 1;
    } else {
      submitError = err.message || "Registration failed.";
    }
    render();
  }
});

render();
