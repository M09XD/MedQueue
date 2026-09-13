import { icon, refreshIcons } from "../shared/icons.js";
import { badge, btn } from "../shared/ui.js";
import { doctorCard } from "../shared/doctorCard.js";
import { DOCTOR_TOKEN_PREFIX } from "../shared/data.js";
import {
  requireRole, getDoctors, getSpecialties,
  getPendingDoctorId, clearPendingDoctorId,
  getPatientTokens, setPatientTokens,
} from "../shared/store.js";
import { attachTiltEffects } from "../shared/tilt.js";
import { mountNav } from "../shared/nav.js";

const user = requireRole("patient");
if (user) {
  mountNav("patient-dashboard");
  boot();
}

function boot() {
  let flowStep = "select-specialty"; // select-specialty | select-doctor | generating | tracking | history
  let selectedSpecialty = null;
  let myTokens = getPatientTokens();
  if (myTokens.length > 0) flowStep = "tracking";
  let trackingInterval = null;

  function ensureTracking() {
    if (flowStep !== "tracking" || myTokens.length === 0) {
      clearInterval(trackingInterval);
      trackingInterval = null;
      return;
    }
    if (trackingInterval) return;
    trackingInterval = setInterval(() => {
      myTokens = myTokens.map((t) => (t.status === "waiting" ? { ...t, position: Math.max(1, t.position - 1) } : t));
      setPatientTokens(myTokens);
      render();
    }, 8000);
  }

  function generateToken(doctorId) {
    flowStep = "generating";
    render();
    setTimeout(() => {
      const doctors = getDoctors();
      const doc = doctors.find((d) => d.id === doctorId);
      const prefix = DOCTOR_TOKEN_PREFIX[doctorId] || "X";
      const existingForDoc = myTokens.filter((t) => t.doctorId === doctorId).length;
      const initialPos = doc.queueCount + 1 + existingForDoc;
      const token = {
        id: `my-token-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        number: prefix + initialPos.toString().padStart(2, "0"),
        patientName: user.profile.name || "Patient",
        doctorId,
        status: "waiting",
        position: initialPos,
        isEmergency: false,
        estimatedWait: initialPos * doc.avgWait,
        createdAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      myTokens = [...myTokens, token];
      setPatientTokens(myTokens);
      flowStep = "tracking";
      render();
    }, 2000);
  }

  function specialtyGrid() {
    const doctors = getDoctors();
    const specialties = getSpecialties();
    return `
      <div>
        <h2 style="margin-bottom:1rem;">Select a Specialty</h2>
        <div class="grid grid-4">
          ${specialties.map((s) => {
            const count = doctors.filter((d) => d.specialty === s && d.available).length;
            return `
              <button class="specialty-tile" data-action="select-specialty" data-specialty="${s}">
                ${icon("stethoscope", "ic-md", "cyan-text")}
                <div style="font-weight:600; color:#fff; font-size:0.875rem; margin-top:0.75rem; font-family:var(--font-heading);">${s}</div>
                <div class="xs faint mt-2">${count} available</div>
              </button>`;
          }).join("")}
        </div>
      </div>
    `;
  }

  function doctorPicker() {
    const availableDoctors = getDoctors().filter((d) => d.specialty === selectedSpecialty && d.available);
    return `
      <div>
        <button class="link-btn small" data-action="flow" data-step="select-specialty" style="margin-bottom:1.5rem;">← Back to specialties</button>
        <h2 style="margin-bottom:1rem;">${selectedSpecialty} — Choose a Doctor</h2>
        ${
          availableDoctors.length === 0
            ? `<div class="empty">
                 ${icon("stethoscope", "ic-xl")}
                 <p style="color:var(--text-muted); font-weight:500;">No doctors are available in this specialty right now.</p>
                 <p class="small mt-2">Try another specialty or check back later.</p>
                 ${btn({ label: "Try Another Specialty", variant: "outline", attrs: 'data-action="flow" data-step="select-specialty"', size: "md" })}
               </div>`
            : `<div class="grid grid-3">${availableDoctors.map((d) => doctorCard(d, { action: "book" })).join("")}</div>`
        }
      </div>
    `;
  }

  function generatingView() {
    return `
      <div class="flex flex-col items-center justify-center" style="padding: 8rem 0;">
        <div style="position:relative; margin-bottom:1.5rem;">
          <div class="spinner"></div>
          <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">${icon("activity", "ic-lg", "cyan-text")}</div>
        </div>
        <p style="font-size:1.25rem; font-weight:600; color:#fff;">Generating your token...</p>
        <p class="small muted mt-2">Securing your place in the queue</p>
      </div>
    `;
  }

  function trackingView() {
    const doctors = getDoctors();
    return `
      <div class="flex flex-col gap-6">
        ${myTokens
          .map((token) => {
            const tokenDoc = doctors.find((d) => d.id === token.doctorId);
            if (!tokenDoc) return "";
            const initialPos = Math.round(token.estimatedWait / Math.max(1, tokenDoc.avgWait));
            const progressPct = Math.max(5, 100 - (token.position / Math.max(1, initialPos)) * 100);
            return `
              <div class="grid grid-2" style="align-items:start;">
                <div class="token-card">
                  <div class="flex justify-between items-start mb-6">
                    <div>
                      <div class="token-label">Your Token</div>
                      <div class="token-number">${token.number}</div>
                    </div>
                    ${badge("Active", "success")}
                  </div>
                  <div class="mb-6">
                    <div class="token-detail-row"><span class="k">Doctor</span><span class="v">${tokenDoc.name}</span></div>
                    <div class="token-detail-row"><span class="k">Specialty</span><span class="v">${tokenDoc.specialty}</span></div>
                    <div class="token-detail-row"><span class="k">Room</span><span class="v">${tokenDoc.room}</span></div>
                    <div class="token-detail-row"><span class="k">Generated</span><span class="v">${token.createdAt}</span></div>
                  </div>
                  ${btn({ label: "Cancel Token", variant: "danger", size: "sm", block: true, attrs: `data-action="cancel" data-token-id="${token.id}"` })}
                </div>

                <div class="flex flex-col gap-4">
                  <div class="card card-pad" aria-live="polite" aria-label="Live queue position">
                    <div class="small muted mb-2">Your Position</div>
                    <div class="position-num">#${token.position}</div>
                    <div class="small muted">
                      ${
                        token.position === 1
                          ? `<span class="cyan-text" style="font-weight:600;">You're next! Please head to ${tokenDoc.room}.</span>`
                          : `${token.position - 1} patient${token.position > 2 ? "s" : ""} ahead of you`
                      }
                    </div>
                    <div class="flex items-center gap-2 small muted mt-4">${icon("clock", "ic-base")} Estimated wait: ~${token.position * tokenDoc.avgWait} min</div>
                    <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%;"></div></div>
                  </div>

                  <div class="card card-pad">
                    <div class="small" style="font-weight:600; color:#fff; margin-bottom:0.75rem;">Status Updates</div>
                    <div class="status-update-row">${icon("check-circle", "ic-base", "text-emerald")} <div><span style="color:#fff;">Token #${token.number} confirmed.</span> <span class="faint">You're ${initialPos}th in line.</span></div></div>
                    ${
                      token.position < initialPos
                        ? `<div class="status-update-row">${icon("activity", "ic-base", "cyan-text")} <div><span style="color:#fff;">Queue advancing.</span> <span class="faint">Now #${token.position} in line.</span></div></div>`
                        : ""
                    }
                    ${
                      token.position === 1
                        ? `<div class="status-update-row">${icon("bell", "ic-base", "text-amber")} <div><span class="text-amber" style="font-weight:500;">You're next. Please head to ${tokenDoc.room}.</span></div></div>`
                        : ""
                    }
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function historyView() {
    const doctors = getDoctors();
    const rows = myTokens.map((t) => {
      const d = doctors.find((doc) => doc.id === t.doctorId);
      return {
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        doctor: d?.name ?? "—",
        specialty: d?.specialty ?? "—",
        token: t.number,
        status: t.status === "completed" ? "completed" : "waiting",
      };
    });
    return `
      <div>
        <h2 style="margin-bottom:1rem;">Appointment History</h2>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Doctor</th><th class="md-block hidden">Specialty</th><th>Token</th><th>Status</th></tr></thead>
            <tbody>
              ${rows
                .map(
                  (h) => `
                <tr>
                  <td style="color:#cbd5e1;">${h.date}</td>
                  <td style="color:#fff; font-weight:500;">${h.doctor}</td>
                  <td class="md-block hidden muted">${h.specialty}</td>
                  <td class="cyan-text" style="font-family:monospace;">${h.token}</td>
                  <td>${badge(h.status, h.status === "completed" ? "success" : "warning")}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        ${btn({ label: "← Back to Queue", variant: "outline", size: "sm", attrs: 'data-action="flow" data-step="select-specialty"' })}
      </div>
    `;
  }

  function render() {
    let body = "";
    if (flowStep === "select-specialty") body = specialtyGrid();
    else if (flowStep === "select-doctor") body = doctorPicker();
    else if (flowStep === "generating") body = generatingView();
    else if (flowStep === "tracking" && myTokens.length > 0) body = trackingView();
    else if (flowStep === "history") body = historyView();
    else body = specialtyGrid();

    const headerActions = `
      ${btn({ label: `${icon("file-text", "ic-base")} History`, variant: "ghost", size: "sm", attrs: 'data-action="flow" data-step="history"' })}
      ${
        myTokens.length > 0 && flowStep !== "tracking" && flowStep !== "generating"
          ? btn({ label: `My Queue (${myTokens.length})`, variant: "ghost", size: "sm", attrs: 'data-action="flow" data-step="tracking"' })
          : ""
      }
      ${
        flowStep !== "select-specialty" && flowStep !== "history"
          ? btn({ label: "New Queue", variant: "ghost", size: "sm", attrs: 'data-action="flow" data-step="select-specialty"' })
          : ""
      }
    `;

    document.getElementById("page-root").innerHTML = `
      <div class="page">
        <div class="page-medium">
          <div class="dash-header">
            <div>
              <h1 class="dash-title">Patient Dashboard</h1>
              <p class="small muted mt-2">Hello, ${user.profile.name || "Patient"} · ID #${user.profile.patientId}</p>
            </div>
            <div class="flex gap-2">${headerActions}</div>
          </div>

          <div class="profile-strip">
            <span class="flex items-center gap-2 muted">${icon("user", "ic-sm", "cyan-text")} <span style="color:#fff; font-weight:500;">${user.profile.name || "—"}</span></span>
            ${user.profile.email ? `<span class="flex items-center gap-2 muted"><span class="cyan-text">@</span> ${user.profile.email}</span>` : ""}
            ${user.profile.phone ? `<span class="flex items-center gap-2 muted">${icon("phone", "ic-sm", "cyan-text")} ${user.profile.phone}</span>` : ""}
            ${user.profile.condition ? `<span class="flex items-center gap-2 muted">${icon("file-text", "ic-sm", "cyan-text")} ${user.profile.condition}</span>` : ""}
            <span class="push-right">Joined ${user.profile.joinedDate}</span>
          </div>

          ${body}
        </div>
      </div>
    `;
    refreshIcons();
    attachTiltEffects();
    ensureTracking();
  }

  document.getElementById("page-root").addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (action === "select-specialty") {
      selectedSpecialty = el.dataset.specialty;
      flowStep = "select-doctor";
      render();
    } else if (action === "flow") {
      flowStep = el.dataset.step;
      render();
    } else if (action === "book") {
      generateToken(el.dataset.doctorId);
    } else if (action === "cancel") {
      myTokens = myTokens.filter((t) => t.id !== el.dataset.tokenId);
      setPatientTokens(myTokens);
      if (myTokens.length === 0) flowStep = "select-specialty";
      render();
    }
  });

  // Auto-generate a token if we arrived here via "Get Token" on the Doctors page
  const pendingId = getPendingDoctorId();
  if (pendingId) {
    clearPendingDoctorId();
    generateToken(pendingId);
  } else {
    render();
  }
}
