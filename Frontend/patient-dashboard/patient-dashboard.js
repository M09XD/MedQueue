import { icon, refreshIcons } from "../shared/icons.js";
import { badge, btn, esc, fmtDateTime, fmtTime } from "../shared/ui.js";
import { doctorCard } from "../shared/doctorCard.js";
import { requireRole, fetchDoctors, fetchPatientTokens, bookToken, cancelToken, handleAuthError } from "../shared/api.js";
import { getPendingDoctorId, clearPendingDoctorId } from "../shared/store.js";
import { startPolling } from "../shared/poll.js";
import { attachTiltEffects } from "../shared/tilt.js";
import { mountNav } from "../shared/nav.js";

requireRole("patient").then((user) => {
  if (!user) return;
  mountNav("patient-dashboard");
  boot(user);
});

const ACTIVE = ["waiting", "called", "in_progress"];

function boot(user) {
  let flowStep = "select-specialty"; // select-specialty | select-doctor | tracking | history
  let selectedSpecialty = null;
  let doctors = [];
  let tokens = [];
  let reports = [];
  let busy = false;
  let notice = "";
  let lastSnapshot = "";
  const peakPosition = {}; // token id -> largest queue position seen, for the progress bar

  const activeTokens = () => tokens.filter((t) => ACTIVE.includes(t.status));

  function applyServerState(data) {
    tokens = data.tokens;
    reports = data.reports;
    tokens.forEach((t) => {
      if (t.queuePosition) peakPosition[t.id] = Math.max(peakPosition[t.id] || 0, t.queuePosition);
    });
    const snapshot = JSON.stringify(data);
    const changed = snapshot !== lastSnapshot;
    lastSnapshot = snapshot;
    return changed;
  }

  async function poll(signal) {
    try {
      const changed = applyServerState(await fetchPatientTokens(signal));
      if (changed && !busy) {
        if (flowStep === "tracking" && activeTokens().length === 0) flowStep = "select-specialty";
        if (flowStep === "tracking" || flowStep === "history") render();
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      if (handleAuthError(err)) return;
      throw err; // lets the poller back off
    }
  }

  async function book(doctorId) {
    if (busy) return;
    busy = true;
    notice = "";
    render();
    try {
      await bookToken(doctorId);
      applyServerState(await fetchPatientTokens());
      flowStep = "tracking";
    } catch (err) {
      if (handleAuthError(err)) return;
      notice = err.message;
      flowStep = activeTokens().length ? "tracking" : "select-specialty";
    } finally {
      busy = false;
      render();
    }
  }

  async function cancel(tokenId) {
    if (busy) return;
    busy = true;
    notice = "";
    render();
    try {
      await cancelToken(tokenId);
      applyServerState(await fetchPatientTokens());
      if (activeTokens().length === 0) flowStep = "select-specialty";
    } catch (err) {
      if (handleAuthError(err)) return;
      notice = err.message;
    } finally {
      busy = false;
      render();
    }
  }

  // ---------- views ----------
  function specialtyGrid() {
    const specialties = [...new Set(doctors.map((d) => d.specialty))].sort();
    if (specialties.length === 0) {
      return `<div class="empty">${icon("stethoscope", "ic-xl")}<p class="small">No specialties are available yet.</p></div>`;
    }
    return `
      <div>
        <h2 style="margin-bottom:1rem;">Select a Specialty</h2>
        <div class="grid grid-4">
          ${specialties.map((s) => {
            const count = doctors.filter((d) => d.specialty === s && d.available).length;
            return `
              <button class="specialty-tile" data-action="select-specialty" data-specialty="${esc(s)}">
                ${icon("stethoscope", "ic-md", "cyan-text")}
                <div style="font-weight:600; color:#fff; font-size:0.875rem; margin-top:0.75rem; font-family:var(--font-heading);">${esc(s)}</div>
                <div class="xs faint mt-2">${count} available</div>
              </button>`;
          }).join("")}
        </div>
      </div>`;
  }

  function doctorPicker() {
    const available = doctors.filter((d) => d.specialty === selectedSpecialty && d.available);
    return `
      <div>
        <button class="link-btn small" data-action="flow" data-step="select-specialty" style="margin-bottom:1.5rem;">← Back to specialties</button>
        <h2 style="margin-bottom:1rem;">${esc(selectedSpecialty)} — Choose a Doctor</h2>
        ${
          available.length === 0
            ? `<div class="empty">${icon("stethoscope", "ic-xl")}
                 <p style="color:var(--text-muted); font-weight:500;">No doctors are available in this specialty right now.</p>
                 <p class="small mt-2">Try another specialty or check back later.</p>
                 ${btn({ label: "Try Another Specialty", variant: "outline", attrs: 'data-action="flow" data-step="select-specialty"', size: "md" })}
               </div>`
            : `<div class="grid grid-3">${available.map((d) => doctorCard(d, { action: "book" })).join("")}</div>`
        }
      </div>`;
  }

  function generatingView() {
    return `
      <div class="flex flex-col items-center justify-center" style="padding: 8rem 0;">
        <div style="position:relative; margin-bottom:1.5rem;">
          <div class="spinner"></div>
          <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">${icon("activity", "ic-lg", "cyan-text")}</div>
        </div>
        <p style="font-size:1.25rem; font-weight:600; color:#fff;">Working on it...</p>
        <p class="small muted mt-2">Securing your place in the queue</p>
      </div>`;
  }

  function positionCard(t) {
    if (t.status === "called") {
      return `<div class="card card-pad" aria-live="polite"><div class="small muted mb-2">Status</div>
        <div class="position-num" style="font-size:2rem;">You're called</div>
        <div class="small cyan-text" style="font-weight:600;">Please head to ${esc(t.room)} now.</div></div>`;
    }
    if (t.status === "in_progress") {
      return `<div class="card card-pad" aria-live="polite"><div class="small muted mb-2">Status</div>
        <div class="position-num" style="font-size:2rem;">In consultation</div>
        <div class="small muted">${esc(t.doctorName)} is seeing you in ${esc(t.room)}.</div></div>`;
    }
    const pos = t.queuePosition;
    const peak = Math.max(peakPosition[t.id] || pos, pos);
    const pct = Math.max(5, 100 - (pos / peak) * 100);
    return `
      <div class="card card-pad" aria-live="polite" aria-label="Live queue position">
        <div class="small muted mb-2">Your Position</div>
        <div class="position-num">#${pos}</div>
        <div class="small muted">${
          pos === 1
            ? `<span class="cyan-text" style="font-weight:600;">You're next! Please stay close to ${esc(t.room)}.</span>`
            : `${t.ahead} patient${t.ahead === 1 ? "" : "s"} ahead of you`
        }</div>
        <div class="flex items-center gap-2 small muted mt-4">${icon("clock", "ic-base")} Estimated wait: ~${Number(t.estimatedWait)} min</div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
      </div>`;
  }

  function trackingView() {
    return `
      <div class="flex flex-col gap-6">
        ${activeTokens().map((t) => `
          <div class="grid grid-2" style="align-items:start;">
            <div class="token-card">
              <div class="flex justify-between items-start mb-6">
                <div><div class="token-label">Your Token</div><div class="token-number">${esc(t.number)}</div></div>
                ${t.isEmergency ? badge("Emergency", "emergency") : badge(t.status.replace("_", " "), t.status === "waiting" ? "success" : "default")}
              </div>
              <div class="mb-6">
                <div class="token-detail-row"><span class="k">Doctor</span><span class="v">${esc(t.doctorName)}</span></div>
                <div class="token-detail-row"><span class="k">Specialty</span><span class="v">${esc(t.specialty)}</span></div>
                <div class="token-detail-row"><span class="k">Room</span><span class="v">${esc(t.room)}</span></div>
                <div class="token-detail-row"><span class="k">Generated</span><span class="v">${fmtTime(t.createdAt)}</span></div>
              </div>
              ${t.status === "in_progress" ? "" : btn({ label: "Cancel Token", variant: "danger", size: "sm", block: true, disabled: busy, attrs: `data-action="cancel" data-token-id="${Number(t.id)}"` })}
            </div>
            <div class="flex flex-col gap-4">${positionCard(t)}</div>
          </div>`).join("")}
      </div>`;
  }

  function historyView() {
    const rows = tokens.map((t) => `
      <tr>
        <td style="color:#cbd5e1;">${fmtDateTime(t.createdAt)}</td>
        <td style="color:#fff; font-weight:500;">${esc(t.doctorName)}</td>
        <td class="md-block hidden muted">${esc(t.specialty)}</td>
        <td class="cyan-text" style="font-family:monospace;">${esc(t.number)}</td>
        <td>${badge(t.status.replace("_", " "), t.status === "completed" ? "success" : ACTIVE.includes(t.status) ? "default" : "warning")}</td>
      </tr>`).join("");
    const reportCards = reports.map((r) => `
      <div class="card card-pad">
        <div class="flex justify-between items-center mb-2"><strong style="color:#fff;">${esc(r.doctorName)}</strong><span class="xs faint">${fmtDateTime(r.updatedAt)}</span></div>
        <div class="small" style="color:#cbd5e1;"><strong>Diagnosis:</strong> ${esc(r.diagnosis)}</div>
        <div class="small mt-2" style="color:#cbd5e1;"><strong>Prescription:</strong> ${esc(r.prescription)}</div>
        ${r.followUp ? `<div class="small mt-2 muted"><strong>Follow-up:</strong> ${esc(r.followUp)}</div>` : ""}
      </div>`).join("");
    return `
      <div>
        <h2 style="margin-bottom:1rem;">Appointment History</h2>
        ${tokens.length === 0
          ? `<div class="empty">${icon("file-text", "ic-xl")}<p class="small">No appointments yet.</p></div>`
          : `<div class="table-wrap"><table class="data-table">
               <thead><tr><th>Date</th><th>Doctor</th><th class="md-block hidden">Specialty</th><th>Token</th><th>Status</th></tr></thead>
               <tbody>${rows}</tbody></table></div>`}
        ${reports.length ? `<h2 style="margin:1.5rem 0 1rem;">My Visit Reports</h2><div class="flex flex-col gap-3">${reportCards}</div>` : ""}
        <div class="mt-4">${btn({ label: "← Back to Queue", variant: "outline", size: "sm", attrs: 'data-action="flow" data-step="tracking"' })}</div>
      </div>`;
  }

  function render() {
    let body;
    if (busy && flowStep !== "tracking") body = generatingView();
    else if (flowStep === "select-doctor") body = doctorPicker();
    else if (flowStep === "tracking" && activeTokens().length) body = trackingView();
    else if (flowStep === "history") body = historyView();
    else body = specialtyGrid();

    const p = user.profile;
    const headerActions = `
      ${btn({ label: `${icon("file-text", "ic-base")} History`, variant: "ghost", size: "sm", attrs: 'data-action="flow" data-step="history"' })}
      ${activeTokens().length && flowStep !== "tracking" ? btn({ label: "My Queue", variant: "ghost", size: "sm", attrs: 'data-action="flow" data-step="tracking"' }) : ""}`;

    document.getElementById("page-root").innerHTML = `
      <div class="page"><div class="page-medium">
        <div class="dash-header">
          <div>
            <h1 class="dash-title">Patient Dashboard</h1>
            <p class="small muted mt-2">Hello, ${esc(p.name)} · ID ${esc(p.patientId)}</p>
          </div>
          <div class="flex gap-2">${headerActions}</div>
        </div>
        <div class="profile-strip">
          <span class="flex items-center gap-2 muted">${icon("user", "ic-sm", "cyan-text")} <span style="color:#fff; font-weight:500;">${esc(p.name)}</span></span>
          ${user.email ? `<span class="flex items-center gap-2 muted"><span class="cyan-text">@</span> ${esc(user.email)}</span>` : ""}
          ${p.phone ? `<span class="flex items-center gap-2 muted">${icon("phone", "ic-sm", "cyan-text")} ${esc(p.phone)}</span>` : ""}
          ${p.condition ? `<span class="flex items-center gap-2 muted">${icon("file-text", "ic-sm", "cyan-text")} ${esc(p.condition)}</span>` : ""}
          <span class="push-right">Joined ${fmtDateTime(p.joinedAt)}</span>
        </div>
        ${notice ? `<p class="error-banner" role="alert" style="margin-bottom:1rem;">${icon("alert-triangle", "ic-sm")} ${esc(notice)}</p>` : ""}
        ${body}
      </div></div>`;
    refreshIcons();
    attachTiltEffects();
  }

  document.getElementById("page-root").addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (action === "select-specialty") {
      selectedSpecialty = el.dataset.specialty;
      flowStep = "select-doctor";
      notice = "";
      render();
    } else if (action === "flow") {
      flowStep = el.dataset.step === "tracking" && activeTokens().length === 0 ? "select-specialty" : el.dataset.step;
      notice = "";
      render();
    } else if (action === "book") {
      book(Number(el.dataset.doctorId));
    } else if (action === "cancel") {
      cancel(Number(el.dataset.tokenId));
    }
  });

  (async () => {
    document.getElementById("page-root").innerHTML = `<div class="page"><div class="page-medium"><div class="empty"><p class="small">Loading your queue…</p></div></div></div>`;
    try {
      const [docs, state] = await Promise.all([fetchDoctors(), fetchPatientTokens()]);
      doctors = docs;
      applyServerState(state);
    } catch (err) {
      if (handleAuthError(err)) return;
      notice = err.message;
    }
    if (activeTokens().length) flowStep = "tracking";

    const pendingId = getPendingDoctorId();
    if (pendingId) {
      clearPendingDoctorId();
      if (!activeTokens().length) await book(Number(pendingId));
      else render();
    } else {
      render();
    }
    startPolling(poll, { interval: 4000 });
  })();
}
