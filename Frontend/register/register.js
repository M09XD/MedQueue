import { icon, refreshIcons } from "../shared/icons.js";
import { btn, cyanGlow } from "../shared/ui.js";
import { setUser } from "../shared/store.js";
import { mountNav } from "../shared/nav.js";

mountNav("register");

let step = 1;
let form = { name: "", email: "", phone: "", pass: "", condition: "" };
let errors = {};

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
  if (!form.email.match(/^[^@]+@[^@]+\.[^@]+$/)) e.email = "Valid email required";
  if (!form.phone.match(/^\+?[\d\s\-]{7,}/)) e.phone = "Valid phone required";
  if (form.pass.length < 8) e.pass = "Minimum 8 characters";
  errors = e;
  return Object.keys(e).length === 0;
}

function field(id, label, type, placeholder) {
  const err = errors[id];
  return `
    <div class="field">
      <label class="label" for="reg-${id}">${label}</label>
      <input class="input ${err ? "input-error" : ""}" id="reg-${id}" type="${type}" value="${form[id]}" placeholder="${placeholder}" />
      ${err ? `<p class="error-text" role="alert">${err}</p>` : ""}
    </div>
  `;
}

function render() {
  const stepBody =
    step === 1
      ? `
        ${field("name", "Full Name", "text", "Fatima Al-Rashid")}
        ${field("email", "Email", "email", "fatima@example.com")}
        ${field("phone", "Phone Number", "tel", "+1 555-000-0000")}
        ${field("pass", "Password", "password", "At least 8 characters")}
        ${btn({ label: `Continue ${icon("chevron-right", "ic-sm")}`, variant: "primary", size: "lg", block: true, attrs: 'data-action="next"' })}
      `
      : `
        <div class="field">
          <label class="label" for="reg-condition">Medical Condition <span class="faint" style="font-weight:400;">(optional)</span></label>
          <textarea class="input" id="reg-condition" rows="3" placeholder="Briefly describe any existing condition or reason for visit...">${form.condition}</textarea>
        </div>
        <p class="xs faint">Your data is encrypted and only visible to your treating physician.</p>
        ${btn({ label: `${icon("user-check", "ic-sm")} Create Account`, variant: "primary", size: "lg", block: true, type: "submit" })}
        ${btn({ label: "← Back", variant: "ghost", size: "md", block: true, attrs: 'data-action="back"' })}
      `;

  document.getElementById("page-root").innerHTML = `
    <div class="auth-wrap" style="padding-top: 5rem; padding-bottom: 2rem;">
      <div class="auth-box">
        <div class="auth-card">
          ${cyanGlow("auth-glow")}
          <div class="progress-steps">
            <div class="seg ${step >= 1 ? "done" : ""}"></div>
            <div class="seg ${step >= 2 ? "done" : ""}"></div>
          </div>
          <h1 class="auth-title">${step === 1 ? "Create your account" : "Medical details"}</h1>
          <p class="auth-sub">${step === 1 ? "Step 1 of 2 — Basic information" : "Step 2 of 2 — Optional medical info"}</p>

          <form data-form="register" novalidate>${stepBody}</form>

          <p class="auth-footer">
            Already have an account? <a class="link-btn" href="../login/login.html">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `;
  refreshIcons();
}

document.getElementById("page-root").addEventListener("click", (e) => {
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

document.getElementById("page-root").addEventListener("submit", (e) => {
  const form_ = e.target.closest('[data-form="register"]');
  if (!form_) return;
  e.preventDefault();
  captureCondition();

  const profile = {
    name: form.name.trim(),
    email: form.email,
    phone: form.phone,
    condition: form.condition,
    patientId: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
    joinedDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
  };
  setUser("patient", profile);
  location.href = "../patient-dashboard/patient-dashboard.html";
});

render();
