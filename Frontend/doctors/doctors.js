import { icon, refreshIcons } from "../shared/icons.js";
import { doctorCard } from "../shared/doctorCard.js";
import { esc } from "../shared/ui.js";
import { fetchDoctors } from "../shared/api.js";
import { getUser, setPendingDoctorId } from "../shared/store.js";
import { attachTiltEffects } from "../shared/tilt.js";
import { mountNav } from "../shared/nav.js";

mountNav("doctors");

let filter = "All";
let doctors = [];
let state = "loading"; // loading | ready | error
let errorMessage = "";

function render() {
  const specialties = [...new Set(doctors.map((d) => d.specialty))].sort();
  const filtered = filter === "All" ? doctors : doctors.filter((d) => d.specialty === filter);

  const pills = ["All", ...specialties]
    .map((s) => `<button class="pill ${filter === s ? "active" : ""}" data-action="filter" data-specialty="${esc(s)}">${esc(s)}</button>`)
    .join("");

  let grid;
  if (state === "loading") {
    grid = `<div class="empty"><p class="small">Loading doctors…</p></div>`;
  } else if (state === "error") {
    grid = `<div class="empty">${icon("alert-triangle", "ic-2xl")}<p class="empty-title">Could not load doctors</p><p class="small">${esc(errorMessage)}</p>
            <button class="link-btn small" data-action="retry" style="margin-top:1rem;">Try again</button></div>`;
  } else if (filtered.length === 0) {
    grid = `<div class="empty">${icon("stethoscope", "ic-2xl")}<p class="empty-title">No doctors available in this specialty right now.</p><p class="small">Try another specialty or check back later.</p></div>`;
  } else {
    grid = `<div class="grid grid-4">${filtered.map((d) => doctorCard(d, { action: "get-token" })).join("")}</div>`;
  }

  document.getElementById("page-root").innerHTML = `
    <div class="page"><div class="container">
      <div class="mb-8">
        <h1 class="hero-title" style="font-size: clamp(2rem, 4vw, 3rem); margin-bottom: 0.5rem;">Doctor Directory</h1>
        <p class="muted">Browse specialists and generate your queue token instantly.</p>
      </div>
      <div class="pill-row" role="group" aria-label="Filter by specialty">${pills}</div>
      ${grid}
    </div></div>`;
  refreshIcons();
  attachTiltEffects();
}

async function load() {
  state = "loading";
  render();
  try {
    doctors = await fetchDoctors();
    state = "ready";
  } catch (err) {
    state = "error";
    errorMessage = err.message;
  }
  render();
}

document.getElementById("page-root").addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (el.dataset.action === "filter") {
    filter = el.dataset.specialty;
    render();
  } else if (el.dataset.action === "retry") {
    load();
  } else if (el.dataset.action === "get-token") {
    const user = getUser(); // UX routing only; the server re-checks the session on booking
    if (user && user.role === "patient") {
      setPendingDoctorId(el.dataset.doctorId);
      location.href = "../patient-dashboard/patient-dashboard.html";
    } else {
      location.href = "../login/login.html";
    }
  }
});

load();
