import { icon, refreshIcons } from "../shared/icons.js";
import { badge, btn } from "../shared/ui.js";
import { DOCTOR_TOKEN_PREFIX, PATIENT_NAME_POOL, buildDoctorQueue, PATIENT_REPORTS } from "../shared/data.js";
import { requireRole, getDoctors, getDoctorSession, setDoctorSession } from "../shared/store.js";
import { mountNav } from "../shared/nav.js";

const user = requireRole("doctor");
if (user) {
  mountNav("doctor-dashboard");
  boot();
}

function boot() {
  const doctor = getDoctors().find((d) => d.id === user.profile.doctorId) || getDoctors()[0];

  // Restore this doctor's in-progress shift if they've visited before,
  // otherwise start a fresh simulated queue.
  let session = getDoctorSession(doctor.id) || {
    queue: buildDoctorQueue(doctor),
    activeTab: "queue",
    available: doctor.available,
    sessionHistory: [],
    nextTokenNum: doctor.queueCount + 2,
  };

  let settingsSaved = false;
  let settingsSavedTimeout = null;
  let settingsDraft = session.settingsDraft || { start: "09:00", end: "17:00", unavailFrom: "", unavailTo: "" };
  let arrivalInterval = null;

  function persist() {
    setDoctorSession(doctor.id, { ...session, settingsDraft });
  }

  function ensureArrivals() {
    if (!session.available) { clearInterval(arrivalInterval); arrivalInterval = null; return; }
    if (arrivalInterval) return;
    arrivalInterval = setInterval(() => {
      const prefix = DOCTOR_TOKEN_PREFIX[doctor.id] ?? "Z";
      const num = String(session.nextTokenNum).padStart(2, "0");
      session.nextTokenNum += 1;
      const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const randomName = PATIENT_NAME_POOL[Math.floor(Math.random() * PATIENT_NAME_POOL.length)];
      const waiting = session.queue.filter((t) => t.status === "waiting");
      session.queue = [...session.queue, {
        id: `${doctor.id}-live-${Date.now()}`,
        number: `${prefix}${num}`,
        patientName: randomName,
        doctorId: doctor.id,
        status: "waiting",
        position: waiting.length + 1,
        isEmergency: false,
        estimatedWait: (waiting.length + 1) * doctor.avgWait,
        createdAt: timeStr,
      }];
      persist();
      render();
    }, 18000);
  }

  function sortQueue(list) {
    return [...list].sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      return a.position - b.position;
    });
  }

  function queueTab() {
    const waiting = session.queue.filter((t) => t.status === "waiting");
    const inProgress = session.queue.find((t) => t.status === "in-progress");

    const currentPatientBox = inProgress
      ? `
        <div class="card card-solid card-pad" style="border-color: var(--cyan-border);">
          <div class="flex justify-between items-center mb-3">
            <span style="font-family:monospace; font-size:1.5rem; font-weight:700; color:var(--cyan-light);">${inProgress.number}</span>
            ${badge(inProgress.isEmergency ? "Emergency" : "In Progress", inProgress.isEmergency ? "emergency" : "default")}
          </div>
          <div style="font-weight:600; color:#fff; margin-bottom:0.25rem;">${inProgress.patientName}</div>
          <div class="xs faint mb-4">Arrived: ${inProgress.createdAt}</div>
          <div class="flex flex-col gap-2">
            ${btn({ label: `${icon("check-circle", "ic-base")} Complete`, variant: "primary", size: "sm", block: true, attrs: `data-action="update-token" data-id="${inProgress.id}" data-status="completed"` })}
            ${btn({ label: `${icon("skip-forward", "ic-base")} Skip / No-show`, variant: "ghost", size: "sm", block: true, attrs: `data-action="update-token" data-id="${inProgress.id}" data-status="skipped"` })}
          </div>
        </div>`
      : `
        <div class="card card-pad text-center" style="padding: 2.5rem 1.25rem;">
          ${icon("user-check", "ic-xl")}
          <p class="small faint mt-2">No patient in progress</p>
          ${waiting.length > 0 ? btn({ label: "Call Next", variant: "primary", size: "sm", attrs: `data-action="update-token" data-id="${waiting[0].id}" data-status="in-progress"` }) : ""}
        </div>`;

    const waitingList =
      waiting.length === 0
        ? `<div class="card card-pad text-center" style="padding: 2.5rem;">${icon("users", "ic-xl")}<p class="small faint mt-2">Queue is empty — new patients will appear automatically</p></div>`
        : `<div class="flex flex-col gap-3" aria-live="polite" aria-label="Waiting queue">
             ${waiting
               .map(
                 (t, i) => `
               <div class="queue-row ${t.isEmergency ? "emergency" : ""}">
                 <div class="flex items-center gap-3" style="min-width:0;">
                   <span class="queue-num-badge">${i + 1}</span>
                   <div style="min-width:0;">
                     <div class="flex items-center gap-2 flex-wrap">
                       <span style="font-family:monospace; font-weight:700; color:var(--cyan-light); font-size:0.875rem;">${t.number}</span>
                       ${t.isEmergency ? badge("Emergency", "emergency", icon("alert-triangle", "ic-xs")) : ""}
                     </div>
                     <div class="small" style="font-weight:500; color:#fff;">${t.patientName}</div>
                     <div class="xs faint">~${t.estimatedWait} min wait · Registered ${t.createdAt}</div>
                   </div>
                 </div>
                 <div class="flex gap-2" style="flex-shrink:0;">
                   ${btn({ label: "Call", variant: "primary", size: "sm", attrs: `data-action="update-token" data-id="${t.id}" data-status="in-progress"` })}
                   ${btn({ label: icon("alert-triangle", "ic-sm"), variant: "danger", size: "sm", ariaLabel: "Flag as emergency", attrs: `data-action="mark-emergency" data-id="${t.id}"` })}
                   ${btn({ label: icon("skip-forward", "ic-sm"), variant: "ghost", size: "sm", ariaLabel: "Skip patient", attrs: `data-action="update-token" data-id="${t.id}" data-status="skipped"` })}
                 </div>
               </div>`
               )
               .join("")}
           </div>`;

    return `
      <div class="grid" id="queue-tab-grid">
        <div>
          <h2 class="xs" style="text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); margin-bottom:0.75rem;">Current Patient</h2>
          ${currentPatientBox}
        </div>
        <div>
          <div class="flex justify-between items-center mb-3">
            <h2 class="xs" style="text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted);">Waiting Queue — ${doctor.specialty}</h2>
            <span class="xs faint flex items-center gap-1"><span class="pulse-dot"></span> Live · new patients auto-arrive</span>
          </div>
          ${waitingList}
        </div>
      </div>
      <style>@media (min-width:768px){ #queue-tab-grid{ grid-template-columns: 1fr 2fr !important; } }</style>
    `;
  }

  function historyTab() {
    const seededHistory = PATIENT_REPORTS.filter((r) => r.doctorId === doctor.id).map((r) => ({
      name: r.patientName, time: r.time, duration: `${8 + Math.floor(Math.random() * 15)} min`, status: "completed",
    }));
    const rows = [
      ...session.sessionHistory.map((t) => ({ name: t.patientName, time: t.createdAt, duration: `${doctor.avgWait} min`, status: t.status })),
      ...seededHistory,
    ];
    return `
      <div>
        <h2 style="margin-bottom:1rem;">Appointment History — ${doctor.name}</h2>
        ${
          rows.length === 0
            ? `<div class="empty">${icon("file-text", "ic-xl")}<p class="small">No appointments recorded yet for this session.</p></div>`
            : `<div class="table-wrap"><table class="data-table">
                 <thead><tr><th>Patient</th><th>Time</th><th class="md-block hidden">Duration</th><th>Status</th></tr></thead>
                 <tbody>
                   ${rows
                     .map(
                       (h) => `<tr>
                         <td style="color:#fff; font-weight:500;">${h.name}</td>
                         <td class="muted">${h.time}</td>
                         <td class="md-block hidden muted">${h.duration}</td>
                         <td>${badge(h.status, h.status === "completed" ? "success" : "warning")}</td>
                       </tr>`
                     )
                     .join("")}
                 </tbody>
               </table></div>`
        }
      </div>
    `;
  }

  function settingsTab() {
    return `
      <div style="max-width: 28rem;">
        <h2 style="margin-bottom:1rem;">Availability Settings</h2>
        <div class="card card-pad">
          <div class="field">
            <label class="label" for="start-time">Start Time</label>
            <input class="input" id="start-time" type="time" value="${settingsDraft.start}" />
          </div>
          <div class="field">
            <label class="label" for="end-time">End Time</label>
            <input class="input" id="end-time" type="time" value="${settingsDraft.end}" />
          </div>
          <div class="field">
            <label class="label">Unavailable Block <span class="faint" style="font-weight:400;">(optional)</span></label>
            <div class="flex gap-2">
              <input class="input" id="unavail-from" type="time" value="${settingsDraft.unavailFrom}" placeholder="From" />
              <input class="input" id="unavail-to" type="time" value="${settingsDraft.unavailTo}" placeholder="To" />
            </div>
          </div>
          ${btn({ label: settingsSaved ? `${icon("check-circle", "ic-base")} Saved!` : "Save Settings", variant: "primary", size: "md", block: true, attrs: 'data-action="save-settings"' })}
          ${
            settingsDraft.unavailFrom && settingsDraft.unavailTo
              ? `<p class="xs text-amber flex items-center gap-1 mt-3">${icon("clock", "ic-xs")} Unavailable block set: ${settingsDraft.unavailFrom} – ${settingsDraft.unavailTo}</p>`
              : ""
          }
        </div>
      </div>
    `;
  }

  function render() {
    const waiting = session.queue.filter((t) => t.status === "waiting");
    const completedCount = session.sessionHistory.filter((t) => t.status === "completed").length;
    const seededHistoryCount = PATIENT_REPORTS.filter((r) => r.doctorId === doctor.id).length;
    const historyCount = session.sessionHistory.length + seededHistoryCount;

    const tabs = ["queue", "history", "settings"]
      .map((t) => `<button class="tab ${session.activeTab === t ? "active" : ""}" data-action="tab" data-tab="${t}">${t === "history" ? `History (${historyCount})` : t}</button>`)
      .join("");

    let body = "";
    if (session.activeTab === "queue") body = queueTab();
    else if (session.activeTab === "history") body = historyTab();
    else body = settingsTab();

    document.getElementById("page-root").innerHTML = `
      <div class="page">
        <div class="page-narrow" style="max-width: 1152px;">
          <div class="dash-header">
            <div class="flex items-center gap-4">
              <img class="doctor-header-photo" src="https://images.unsplash.com/${doctor.photo}?w=64&h=64&fit=crop&auto=format" alt="${doctor.name}" />
              <div>
                <h1 class="dash-title">${doctor.name}</h1>
                <p class="small muted">${doctor.specialty} · ${doctor.room} · <span class="text-amber">★ ${doctor.rating}</span></p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="small muted">Availability:</span>
              <button role="switch" aria-checked="${session.available}" aria-label="Toggle availability" class="switch ${session.available ? "on" : ""}" data-action="toggle-availability">
                <span class="switch-knob"></span>
              </button>
              ${badge(session.available ? "Available" : "Unavailable", session.available ? "success" : "warning")}
            </div>
          </div>

          <div class="stats-row-3">
            <div class="stat-box"><div class="num">${waiting.length}</div><div class="lbl">Waiting</div></div>
            <div class="stat-box"><div class="num" style="color:var(--emerald);">${completedCount}</div><div class="lbl">Completed</div></div>
            <div class="stat-box"><div class="num text-amber">${doctor.avgWait} min</div><div class="lbl">Avg Wait</div></div>
          </div>

          <div class="tabs">${tabs}</div>

          ${body}
        </div>
      </div>
    `;
    refreshIcons();
    ensureArrivals();
  }

  document.getElementById("page-root").addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;

    if (action === "tab") {
      session.activeTab = el.dataset.tab;
      persist();
      render();
    } else if (action === "toggle-availability") {
      session.available = !session.available;
      clearInterval(arrivalInterval);
      arrivalInterval = null;
      persist();
      render();
    } else if (action === "update-token") {
      const id = el.dataset.id;
      const status = el.dataset.status;
      const target = session.queue.find((t) => t.id === id);
      session.queue = sortQueue(session.queue.map((t) => (t.id === id ? { ...t, status } : t)));
      if (target && (status === "completed" || status === "skipped")) {
        session.sessionHistory = [{ ...target, status }, ...session.sessionHistory];
      }
      persist();
      render();
    } else if (action === "mark-emergency") {
      session.queue = sortQueue(session.queue.map((t) => (t.id === el.dataset.id ? { ...t, isEmergency: true } : t)));
      persist();
      render();
    } else if (action === "save-settings") {
      const get = (id) => document.getElementById(id)?.value ?? "";
      settingsDraft = {
        start: get("start-time") || settingsDraft.start,
        end: get("end-time") || settingsDraft.end,
        unavailFrom: get("unavail-from"),
        unavailTo: get("unavail-to"),
      };
      settingsSaved = true;
      persist();
      render();
      if (settingsSavedTimeout) clearTimeout(settingsSavedTimeout);
      settingsSavedTimeout = setTimeout(() => { settingsSaved = false; render(); }, 2500);
    }
  });

  render();
}
