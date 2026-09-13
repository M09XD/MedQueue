import { icon, refreshIcons } from "../shared/icons.js";
import { doctorCard } from "../shared/doctorCard.js";
import { getDoctors, getSpecialties, getUser, setPendingDoctorId } from "../shared/store.js";
import { attachTiltEffects } from "../shared/tilt.js";
import { mountNav } from "../shared/nav.js";

mountNav("doctors");

let filter = "All";

function render() {
  const doctors = getDoctors();
  const specialties = getSpecialties();
  const filtered = filter === "All" ? doctors : doctors.filter((d) => d.specialty === filter);

  const pills = ["All", ...specialties]
    .map((s) => `<button class="pill ${filter === s ? "active" : ""}" data-action="filter" data-specialty="${s}">${s}</button>`)
    .join("");

  const grid =
    filtered.length === 0
      ? `<div class="empty">
           ${icon("stethoscope", "ic-2xl")}
           <p class="empty-title">No doctors available in this specialty right now.</p>
           <p class="small">Try another specialty or check back later.</p>
         </div>`
      : `<div class="grid grid-4">${filtered.map((d) => doctorCard(d, { action: "get-token" })).join("")}</div>`;

  document.getElementById("page-root").innerHTML = `
    <div class="page">
      <div class="container">
        <div class="mb-8">
          <h1 class="hero-title" style="font-size: clamp(2rem, 4vw, 3rem); margin-bottom: 0.5rem;">Doctor Directory</h1>
          <p class="muted">Browse specialists and generate your queue token instantly.</p>
        </div>
        <div class="pill-row" role="group" aria-label="Filter by specialty">${pills}</div>
        ${grid}
      </div>
    </div>
  `;
  refreshIcons();
  attachTiltEffects();
}

document.getElementById("page-root").addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (el.dataset.action === "filter") {
    filter = el.dataset.specialty;
    render();
  } else if (el.dataset.action === "get-token") {
    const user = getUser();
    if (user && user.role === "patient") {
      setPendingDoctorId(el.dataset.doctorId);
      location.href = "../patient-dashboard/patient-dashboard.html";
    } else {
      location.href = "../register/register.html";
    }
  }
});

render();
