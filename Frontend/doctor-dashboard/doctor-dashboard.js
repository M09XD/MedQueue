import { icon, refreshIcons } from "../shared/icons.js";
import { badge, btn, esc, fmtDateTime, fmtTime, parseUtc } from "../shared/ui.js";
import { requireRole, fetchDoctorQueue, fetchDoctorHistory, transitionToken, flagEmergency, setAvailability, handleAuthError } from "../shared/api.js";
import { startPolling } from "../shared/poll.js";
import { mountNav } from "../shared/nav.js";

requireRole("doctor").then((user) => {
  if (!user) return;
  mountNav("doctor-dashboard");
  boot(user);
});

function boot(user) {
  const doctor = user.profile;
  let queue = [];
  let history = [];
  let availability = { available: true, workStart: "09:00", workEnd: "17:00", avgWait: 0 };
  let activeTab = "queue";
  let completing = null; // token id while the visit-report form is open
  let draft = { diagnosis: "", prescription: "", followUp: "", notes: "" };
  let busy = false;
  let notice = "";
  let settingsSaved = false;
  let poller = null;

  const waiting = () => queue.filter((t) => t.status === "waiting");
  const current = () => queue.find((t) => t.status === "called" || t.status === "in_progress");
  const isToday = (utc) => { const d = parseUtc(utc); return d && d.toDateString() === new Date().toDateString(); };

  async function refreshQueue(signal) {
    try {
      const data = await fetchDoctorQueue(signal);
      const changed = JSON.stringify(data) !== JSON.stringify({ queue, availability });
      queue = data.queue;
      availability = data.availability;
      // Never re-draw while the doctor is typing a report or editing settings.
      if (changed && !completing && activeTab !== "settings") render();
    } catch (err) {
      if (err.name === "AbortError") return;
      if (handleAuthError(err)) return;
      throw err;
    }
  }

  async function loadHistory() {
    try {
      history = await fetchDoctorHistory();
    } catch (err) {
      if (!handleAuthError(err)) notice = err.message;
    }
  }

  async function act(fn, { after } = {}) {
    if (busy) return;
    busy = true;
    notice = "";
    render();
    try {
      await fn();
      await Promise.all([refreshQueue(), loadHistory()]);
      after?.();
    } catch (err) {
      if (handleAuthError(err)) return;
      notice = err.message;
    } finally {
      busy = false;
      render();
    }
  }

  // ---------- views ----------
  function currentBox() {
    const c = current();
    if (completing && c && c.id === completing) {
      return `
        <div class="card card-solid card-pad" style="border-color: var(--cyan-border);">
          <div class="small" style="font-weight:600; color:#fff; margin-bottom:0.75rem;">Complete visit — ${esc(c.patientName)}</div>
          <div class="field"><label class="label-xs" for="rep-diagnosis">Diagnosis *</label><textarea class="input" id="rep-diagnosis" rows="2" maxlength="5000">${esc(draft.diagnosis)}</textarea></div>
          <div class="field"><label class="label-xs" for="rep-prescription">Prescription *</label><textarea class="input" id="rep-prescription" rows="2" maxlength="5000">${esc(draft.prescription)}</textarea></div>
          <div class="field"><label class="label-xs" for="rep-followup">Follow-up</label><input class="input" id="rep-followup" maxlength="255" value="${esc(draft.followUp)}" /></div>
          <div class="field"><label class="label-xs" for="rep-notes">Notes</label><textarea class="input" id="rep-notes" rows="2" maxlength="5000">${esc(draft.notes)}</textarea></div>
          <div class="flex flex-col gap-2">
            ${btn({ label: `${icon("check-circle", "ic-base")} Save & complete`, variant: "primary", size: "sm", block: true, disabled: busy, attrs: 'data-action="submit-complete"' })}
            ${btn({ label: "Cancel", variant: "ghost", size: "sm", block: true, attrs: 'data-action="cancel-complete"' })}
          </div>
        </div>`;
    }
    if (c) {
      const isCalled = c.status === "called";
      return `
        <div class="card card-solid card-pad" style="border-color: var(--cyan-border);">
          <div class="flex justify-between items-center mb-3">
            <span style="font-family:monospace; font-size:1.5rem; font-weight:700; color:var(--cyan-light);">${esc(c.number)}</span>
            ${badge(isCalled ? "Called" : "In Progress", c.isEmergency ? "emergency" : "default")}
          </div>
          <div style="font-weight:600; color:#fff; margin-bottom:0.25rem;">${esc(c.patientName)}</div>
          <div class="xs faint mb-4">${esc(c.patientCode)} · Registered ${fmtTime(c.createdAt)}</div>
          <div class="flex flex-col gap-2">
            ${isCalled
              ? btn({ label: `${icon("user-check", "ic-base")} Patient arrived — Start`, variant: "primary", size: "sm", block: true, disabled: busy, attrs: `data-action="start" data-id="${Number(c.id)}"` })
              : btn({ label: `${icon("check-circle", "ic-base")} Complete…`, variant: "primary", size: "sm", block: true, disabled: busy, attrs: `data-action="open-complete" data-id="${Number(c.id)}"` })}
            ${btn({ label: `${icon("skip-forward", "ic-base")} Skip / No-show`, variant: "ghost", size: "sm", block: true, disabled: busy, attrs: `data-action="skip" data-id="${Number(c.id)}"` })}
          </div>
          ${isCalled ? `<p class="xs faint mt-3">Called patients who do not arrive are auto-skipped.</p>` : ""}
        </div>`;
    }
    const w = waiting();
    return `
      <div class="card card-pad text-center" style="padding: 2.5rem 1.25rem;">
        ${icon("user-check", "ic-xl")}
        <p class="small faint mt-2">No patient called</p>
        ${w.length ? btn({ label: "Call Next", variant: "primary", size: "sm", disabled: busy, attrs: `data-action="call" data-id="${Number(w[0].id)}"` }) : ""}
      </div>`;
  }

  function queueTab() {
    const w = waiting();
    const hasCurrent = Boolean(current());
    const list = w.length === 0
      ? `<div class="card card-pad text-center" style="padding: 2.5rem;">${icon("users", "ic-xl")}<p class="small faint mt-2">Queue is empty — new bookings appear here automatically</p></div>`
      : `<div class="flex flex-col gap-3" aria-live="polite" aria-label="Waiting queue">
          ${w.map((t, i) => `
            <div class="queue-row ${t.isEmergency ? "emergency" : ""}">
              <div class="flex items-center gap-3" style="min-width:0;">
                <span class="queue-num-badge">${i + 1}</span>
                <div style="min-width:0;">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span style="font-family:monospace; font-weight:700; color:var(--cyan-light); font-size:0.875rem;">${esc(t.number)}</span>
                    ${t.isEmergency ? badge("Emergency", "emergency", icon("alert-triangle", "ic-xs")) : ""}
                  </div>
                  <div class="small" style="font-weight:500; color:#fff;">${esc(t.patientName)}</div>
                  <div class="xs faint">Registered ${fmtTime(t.createdAt)}</div>
                </div>
              </div>
              <div class="flex gap-2" style="flex-shrink:0;">
                ${btn({ label: "Call", variant: "primary", size: "sm", disabled: busy || hasCurrent, attrs: `data-action="call" data-id="${Number(t.id)}"` })}
                ${t.isEmergency ? "" : btn({ label: icon("alert-triangle", "ic-sm"), variant: "danger", size: "sm", ariaLabel: "Flag as emergency", disabled: busy, attrs: `data-action="emergency" data-id="${Number(t.id)}"` })}
                ${btn({ label: icon("skip-forward", "ic-sm"), variant: "ghost", size: "sm", ariaLabel: "Skip patient", disabled: busy, attrs: `data-action="skip" data-id="${Number(t.id)}"` })}
              </div>
            </div>`).join("")}
        </div>`;

    return `
      <div class="grid" id="queue-tab-grid">
        <div>
          <h2 class="xs" style="text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); margin-bottom:0.75rem;">Current Patient</h2>
          ${currentBox()}
        </div>
        <div>
          <div class="flex justify-between items-center mb-3">
            <h2 class="xs" style="text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted);">Waiting Queue — ${esc(doctor.specialty)}</h2>
            <span class="xs faint flex items-center gap-1"><span class="pulse-dot"></span> Live</span>
          </div>
          ${list}
        </div>
      </div>
      <style>@media (min-width:768px){ #queue-tab-grid{ grid-template-columns: 1fr 2fr !important; } }</style>`;
  }

  function historyTab() {
    return `
      <div>
        <h2 style="margin-bottom:1rem;">Appointment History — ${esc(doctor.name)}</h2>
        ${history.length === 0
          ? `<div class="empty">${icon("file-text", "ic-xl")}<p class="small">No completed or skipped appointments yet.</p></div>`
          : `<div class="table-wrap"><table class="data-table">
               <thead><tr><th>Patient</th><th>Token</th><th>When</th><th>Status</th></tr></thead>
               <tbody>${history.map((h) => `<tr>
                 <td style="color:#fff; font-weight:500;">${esc(h.patientName)}</td>
                 <td class="muted" style="font-family:monospace;">${esc(h.number)}</td>
                 <td class="muted">${fmtDateTime(h.completedAt || h.updatedAt)}</td>
                 <td>${badge(h.status, h.status === "completed" ? "success" : "warning")}</td></tr>`).join("")}</tbody></table></div>`}
      </div>`;
  }

  function settingsTab() {
    return `
      <div style="max-width: 28rem;">
        <h2 style="margin-bottom:1rem;">Working Hours</h2>
        <div class="card card-pad">
          <p class="xs faint mb-3">Patients can only book you between these times (hospital timezone).</p>
          <div class="field"><label class="label" for="start-time">Start Time</label><input class="input" id="start-time" type="time" value="${esc(availability.workStart)}" /></div>
          <div class="field"><label class="label" for="end-time">End Time</label><input class="input" id="end-time" type="time" value="${esc(availability.workEnd)}" /></div>
          ${btn({ label: settingsSaved ? `${icon("check-circle", "ic-base")} Saved!` : "Save Settings", variant: "primary", size: "md", block: true, disabled: busy, attrs: 'data-action="save-settings"' })}
        </div>
      </div>`;
  }

  function render() {
    const completedToday = history.filter((h) => h.status === "completed" && isToday(h.completedAt)).length;
    const tabs = ["queue", "history", "settings"]
      .map((t) => `<button class="tab ${activeTab === t ? "active" : ""}" data-action="tab" data-tab="${t}">${t}</button>`)
      .join("");
    const body = activeTab === "queue" ? queueTab() : activeTab === "history" ? historyTab() : settingsTab();

    document.getElementById("page-root").innerHTML = `
      <div class="page"><div class="page-narrow" style="max-width: 1152px;">
        <div class="dash-header">
          <div>
            <h1 class="dash-title">${esc(doctor.name)}</h1>
            <p class="small muted">${esc(doctor.specialty)} · ${esc(doctor.room)}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="small muted">Availability:</span>
            <button role="switch" aria-checked="${availability.available}" aria-label="Toggle availability" class="switch ${availability.available ? "on" : ""}" data-action="toggle-availability"><span class="switch-knob"></span></button>
            ${badge(availability.available ? "Available" : "Unavailable", availability.available ? "success" : "warning")}
          </div>
        </div>
        <div class="stats-row-3">
          <div class="stat-box"><div class="num">${waiting().length}</div><div class="lbl">Waiting</div></div>
          <div class="stat-box"><div class="num" style="color:var(--emerald);">${completedToday}</div><div class="lbl">Completed today</div></div>
          <div class="stat-box"><div class="num text-amber">${Number(availability.avgWait)} min</div><div class="lbl">Avg per patient</div></div>
        </div>
        ${notice ? `<p class="error-banner" role="alert" style="margin-bottom:1rem;">${icon("alert-triangle", "ic-sm")} ${esc(notice)}</p>` : ""}
        <div class="tabs">${tabs}</div>
        ${body}
      </div></div>`;
    refreshIcons();
  }

  document.getElementById("page-root").addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const id = Number(el.dataset.id);
    switch (el.dataset.action) {
      case "tab":
        activeTab = el.dataset.tab;
        settingsSaved = false;
        notice = "";
        render();
        break;
      case "toggle-availability":
        act(() => setAvailability({ available: !availability.available }));
        break;
      case "call": act(() => transitionToken(id, { status: "called" })); break;
      case "start": act(() => transitionToken(id, { status: "in_progress" })); break;
      case "skip": act(() => transitionToken(id, { status: "skipped" })); break;
      case "emergency": act(() => flagEmergency(id)); break;
      case "open-complete":
        completing = id;
        draft = { diagnosis: "", prescription: "", followUp: "", notes: "" };
        render();
        break;
      case "cancel-complete":
        completing = null;
        render();
        break;
      case "submit-complete": {
        const val = (i) => document.getElementById(i)?.value.trim() ?? "";
        draft = { diagnosis: val("rep-diagnosis"), prescription: val("rep-prescription"), followUp: val("rep-followup"), notes: val("rep-notes") };
        if (!draft.diagnosis || !draft.prescription) {
          notice = "Diagnosis and prescription are required to complete a visit.";
          render();
          break;
        }
        act(() => transitionToken(completing, { status: "completed", ...draft }), { after: () => { completing = null; } });
        break;
      }
      case "save-settings": {
        const start = document.getElementById("start-time")?.value;
        const end = document.getElementById("end-time")?.value;
        act(() => setAvailability({ workStart: start, workEnd: end }), { after: () => { settingsSaved = true; setTimeout(() => { settingsSaved = false; if (activeTab === "settings") render(); }, 2500); } });
        break;
      }
    }
  });

  (async () => {
    document.getElementById("page-root").innerHTML = `<div class="page"><div class="page-narrow"><div class="empty"><p class="small">Loading your queue…</p></div></div></div>`;
    try {
      await Promise.all([refreshQueue(), loadHistory()]);
    } catch (err) {
      notice = err.message;
    }
    render();
    poller = startPolling(refreshQueue, { interval: 4000 });
  })();
}
