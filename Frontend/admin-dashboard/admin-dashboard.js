import { icon, refreshIcons } from "../shared/icons.js";
import { badge, btn } from "../shared/ui.js";
import { analyticsData, CHART_COLORS, UNSPLASH_DOCTOR_PHOTOS, PATIENT_REPORTS } from "../shared/data.js";
import { requireRole, getDoctors, setDoctors, getSpecialties, setSpecialties } from "../shared/store.js";
import { mountNav } from "../shared/nav.js";

const user = requireRole("admin");
if (user) {
  mountNav("admin-dashboard");
  boot();
}

function boot() {
  let activeTab = "overview"; // overview | doctors | specialties | reports | config | analytics
  let showAddDoctor = false;
  let editingDoctor = null;
  let editingSpecialty = null; // { index, value }
  let showAddSpecialty = false;
  let selectedReportDoctor = "all";
  let expandedReport = null;
  let chartInstances = {};

  function destroyCharts() {
    Object.values(chartInstances).forEach((c) => c && c.destroy());
    chartInstances = {};
  }

  function photoSrc(photo) {
    if (!photo) return "";
    return photo.startsWith("http") ? photo : `https://images.unsplash.com/${photo}?w=40&h=40&fit=crop&auto=format`;
  }

  // ---------- Views ----------
  function overviewView() {
    const doctors = getDoctors();
    const stats = [
      { label: "Total Patients Today", value: "284", i: "users", delta: "+12%" },
      { label: "Active Doctors", value: String(doctors.filter((d) => d.available).length), i: "stethoscope", delta: "" },
      { label: "Avg Wait Time", value: "14 min", i: "clock", delta: "-3 min" },
      { label: "Tokens Generated", value: "341", i: "file-text", delta: "+8%" },
    ];
    return `
      <div class="flex flex-col gap-6">
        <div class="grid grid-4">
          ${stats
            .map(
              (s) => `
            <div class="card card-pad">
              <div class="flex justify-between items-center mb-3">
                <div class="feature-icon" style="margin-bottom:0;">${icon(s.i, "ic-md")}</div>
                ${s.delta ? `<span class="xs" style="color:var(--emerald);">${s.delta}</span>` : ""}
              </div>
              <div style="font-size:1.5rem; font-weight:700; color:#fff; font-family:var(--font-heading);">${s.value}</div>
              <div class="xs muted">${s.label}</div>
            </div>`
            )
            .join("")}
        </div>
        <div class="grid grid-2">
          <div class="chart-box"><h3>Daily Patients (This Week)</h3><canvas id="chart-daily" height="200"></canvas></div>
          <div class="chart-box">
            <h3>Specialty Distribution</h3>
            <canvas id="chart-specialty" height="200"></canvas>
            <div class="chart-legend">
              ${analyticsData.specialties.map((s, i) => `<span><span class="legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]};"></span>${s.name}</span>`).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function doctorsView() {
    const doctors = getDoctors();
    const specialties = getSpecialties();

    const addForm = showAddDoctor
      ? `
        <div class="card card-pad mb-6" style="border-color: var(--cyan-border);">
          <h3 class="small" style="font-weight:600; color:#fff;">New Doctor Details</h3>
          <div class="grid grid-3 mt-3">
            <div><label class="label-xs">Full Name *</label><input class="input" id="new-doc-name" placeholder="Dr. Full Name" /></div>
            <div><label class="label-xs">Specialty *</label>
              <select class="input" id="new-doc-specialty">${specialties.map((s) => `<option>${s}</option>`).join("")}</select>
            </div>
            <div><label class="label-xs">Room *</label><input class="input" id="new-doc-room" placeholder="e.g. Room 301" /></div>
          </div>
          <div class="field mt-3">
            <label class="label-xs">Doctor Photo — paste an Unsplash photo ID or image URL (optional — random photo used if blank)</label>
            <input class="input" id="new-doc-photo" placeholder="photo-1xxxxxxxx or https://..." />
            <div class="flex flex-wrap gap-2 mt-2">
              <span class="xs faint">Quick picks:</span>
              ${UNSPLASH_DOCTOR_PHOTOS.slice(0, 5).map((p, i) => `<button class="link-btn xs" data-action="pick-quick-photo" data-photo="${p}">Photo ${i + 1}</button>`).join("")}
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            ${btn({ label: "Add Doctor", variant: "primary", size: "sm", attrs: 'data-action="add-doctor"' })}
            ${btn({ label: "Cancel", variant: "ghost", size: "sm", attrs: 'data-action="toggle-add-doctor"' })}
          </div>
        </div>`
      : "";

    const editModal = editingDoctor
      ? `
        <div class="modal-overlay" data-action="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit doctor">
          <div class="modal">
            <div class="flex justify-between items-center mb-4">
              <h3 style="font-size:1.125rem;">Edit Doctor</h3>
              ${btn({ label: icon("x", "ic-base"), variant: "ghost", size: "sm", ariaLabel: "Close", attrs: 'data-action="cancel-edit-doctor"' })}
            </div>
            <div class="grid grid-2">
              <div><label class="label-xs">Full Name</label><input class="input" id="edit-doc-name" value="${editingDoctor.name}" /></div>
              <div><label class="label-xs">Specialty</label>
                <select class="input" id="edit-doc-specialty">${specialties.map((s) => `<option ${s === editingDoctor.specialty ? "selected" : ""}>${s}</option>`).join("")}</select>
              </div>
              <div><label class="label-xs">Room</label><input class="input" id="edit-doc-room" value="${editingDoctor.room}" /></div>
              <div><label class="label-xs">Avg Wait (min)</label><input class="input" id="edit-doc-wait" type="number" value="${editingDoctor.avgWait}" /></div>
              <div style="grid-column: 1 / -1;">
                <label class="label-xs">Photo ID or URL</label>
                <div class="flex gap-3 items-center">
                  <input class="input" id="edit-doc-photo" value="${editingDoctor.photo}" placeholder="photo-1xxxxxxxx or https://..." />
                  <img src="${photoSrc(editingDoctor.photo)}" alt="Preview" style="height:44px;width:44px;border-radius:12px;object-fit:cover;background:#334155;flex-shrink:0;" />
                </div>
              </div>
              <div class="flex items-center gap-3" style="grid-column: 1 / -1;">
                <span class="xs muted">Availability:</span>
                <button role="switch" aria-checked="${editingDoctor.available}" class="switch ${editingDoctor.available ? "on" : ""}" data-action="toggle-editing-available"><span class="switch-knob"></span></button>
                <span class="xs muted">${editingDoctor.available ? "Available" : "Unavailable"}</span>
              </div>
            </div>
            <div class="flex gap-2 mt-4" style="padding-top:1rem; border-top:1px solid var(--border);">
              ${btn({ label: `${icon("check-circle", "ic-base")} Save Changes`, variant: "primary", size: "md", attrs: 'data-action="save-edit-doctor"' })}
              ${btn({ label: "Cancel", variant: "ghost", size: "md", attrs: 'data-action="cancel-edit-doctor"' })}
            </div>
          </div>
        </div>`
      : "";

    return `
      <div>
        <div class="flex justify-between items-center mb-4">
          <h2>Doctor Management</h2>
          ${btn({ label: `${icon("plus", "ic-base")} Add Doctor`, variant: "primary", size: "sm", attrs: 'data-action="toggle-add-doctor"' })}
        </div>
        ${addForm}${editModal}
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Doctor</th><th class="md-block hidden">Specialty</th><th class="md-block hidden">Room</th><th>Status</th><th class="md-block hidden">Queue</th><th class="text-right">Actions</th></tr></thead>
            <tbody>
              ${doctors
                .map(
                  (doc) => `
                <tr>
                  <td><div class="flex items-center gap-2"><img src="${photoSrc(doc.photo)}" alt="${doc.name}" style="height:32px;width:32px;border-radius:50%;object-fit:cover;background:#334155;" /><span style="color:#fff; font-weight:500;">${doc.name}</span></div></td>
                  <td class="md-block hidden muted">${doc.specialty}</td>
                  <td class="md-block hidden muted">${doc.room}</td>
                  <td>${badge(doc.available ? "Active" : "Unavail.", doc.available ? "success" : "warning")}</td>
                  <td class="md-block hidden muted">${doc.queueCount} waiting</td>
                  <td class="text-right">
                    <div class="flex justify-end gap-1">
                      ${btn({ label: `${icon("edit-2", "ic-sm")} <span class="md-block hidden">Edit</span>`, variant: "outline", size: "sm", ariaLabel: `Edit ${doc.name}`, attrs: `data-action="start-edit-doctor" data-id="${doc.id}"` })}
                      ${btn({ label: icon("trash-2", "ic-sm"), variant: "danger", size: "sm", ariaLabel: `Remove ${doc.name}`, attrs: `data-action="remove-doctor" data-id="${doc.id}"` })}
                    </div>
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function specialtiesView() {
    const doctors = getDoctors();
    const specialties = getSpecialties();
    const items = specialties
      .map((s, index) => {
        const count = doctors.filter((d) => d.specialty === s).length;
        const activeCount = doctors.filter((d) => d.specialty === s && d.available).length;
        const isEditing = editingSpecialty?.index === index;
        return `
          <div class="card card-pad" style="padding:0.75rem 1rem;">
            ${
              isEditing
                ? `<div class="flex items-center gap-2">
                     <input class="input" id="edit-specialty-input" value="${editingSpecialty.value}" autofocus style="min-height:40px;" />
                     ${btn({ label: `${icon("check-circle", "ic-sm")} Save`, variant: "primary", size: "sm", attrs: 'data-action="save-edit-specialty"' })}
                     ${btn({ label: icon("x", "ic-sm"), variant: "ghost", size: "sm", attrs: 'data-action="cancel-edit-specialty"' })}
                   </div>`
                : `<div class="flex justify-between items-center">
                     <div class="flex items-center gap-3">
                       ${icon("stethoscope", "ic-base", "cyan-text")}
                       <div><div class="small" style="font-weight:500; color:#fff;">${s}</div><div class="xs faint">${count} doctors · ${activeCount} active</div></div>
                     </div>
                     <div class="flex items-center gap-2">
                       ${badge(`${count} docs`, "muted")}
                       ${btn({ label: `${icon("edit-2", "ic-sm")} <span class="md-block hidden xs">Edit</span>`, variant: "outline", size: "sm", ariaLabel: `Edit ${s}`, attrs: `data-action="start-edit-specialty" data-index="${index}"` })}
                       ${btn({ label: icon("trash-2", "ic-sm"), variant: "danger", size: "sm", ariaLabel: `Remove ${s}`, attrs: `data-action="remove-specialty" data-index="${index}"` })}
                     </div>
                   </div>`
            }
          </div>`;
      })
      .join("");

    const addRow = showAddSpecialty
      ? `<div class="flex gap-2 mt-4">
           <input class="input" id="new-specialty-input" placeholder="New specialty name" autofocus />
           ${btn({ label: "Add", variant: "primary", size: "sm", attrs: 'data-action="add-specialty"' })}
           ${btn({ label: "Cancel", variant: "ghost", size: "sm", attrs: 'data-action="toggle-add-specialty"' })}
         </div>`
      : btn({ label: `${icon("plus", "ic-base")} Add Specialty`, variant: "outline", size: "sm", attrs: 'data-action="toggle-add-specialty"' });

    return `
      <div style="max-width: 42rem;">
        <h2 style="margin-bottom:1rem;">Specialty Management</h2>
        <div class="flex flex-col gap-3">${items}</div>
        <div class="mt-4">${addRow}</div>
      </div>
    `;
  }

  function reportsView() {
    const doctors = getDoctors();
    const filtered = selectedReportDoctor === "all" ? PATIENT_REPORTS : PATIENT_REPORTS.filter((r) => r.doctorId === selectedReportDoctor);
    const options = `<option value="all">All Doctors</option>${doctors.map((d) => `<option value="${d.id}" ${d.id === selectedReportDoctor ? "selected" : ""}>${d.name}</option>`).join("")}`;

    const list =
      filtered.length === 0
        ? `<div class="empty">${icon("file-text", "ic-2xl")}<p class="small">No reports found for this doctor.</p></div>`
        : filtered
            .map((r) => {
              const doctor = doctors.find((d) => d.id === r.doctorId);
              const isExpanded = expandedReport === r.id;
              const initials = r.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2);
              return `
                <div class="report-item ${isExpanded ? "expanded" : ""}">
                  <button class="report-header" data-action="toggle-report" data-id="${r.id}" aria-expanded="${isExpanded}">
                    <div class="flex items-center gap-4" style="min-width:0;">
                      <div class="report-avatar">${initials}</div>
                      <div style="min-width:0;">
                        <div class="small" style="font-weight:600; color:#fff;">${r.patientName}</div>
                        <div class="xs muted">${r.patientId} · ${r.date} at ${r.time}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3" style="flex-shrink:0;">
                      <div class="md-block hidden" style="text-align:right;">
                        <div class="xs" style="font-weight:500; color:#fff;">${doctor?.name ?? "Unknown"}</div>
                        <div class="xs faint">${r.specialty}</div>
                      </div>
                      ${badge(r.status, "success")}
                      <span class="chevron ${isExpanded ? "rotated" : ""}">${icon("chevron-down", "ic-base")}</span>
                    </div>
                  </button>
                  ${
                    isExpanded
                      ? `<div class="report-body">
                           <div class="flex items-center gap-3 mb-4">
                             <img src="${photoSrc(doctor?.photo)}" alt="${doctor?.name || ""}" style="height:36px;width:36px;border-radius:50%;object-fit:cover;background:#334155;" />
                             <div><div class="small" style="font-weight:600; color:#fff;">${doctor?.name ?? ""}</div><div class="xs muted">${r.specialty} · ${doctor?.room ?? ""}</div></div>
                           </div>
                           <div class="grid grid-3">
                             <div class="report-detail-box"><div class="report-detail-label">${icon("file-text", "ic-xs")} Diagnosis</div><p class="small" style="color:#fff;">${r.diagnosis}</p></div>
                             <div class="report-detail-box"><div class="report-detail-label">${icon("activity", "ic-xs")} Prescription</div><p class="small" style="color:#fff;">${r.prescription}</p></div>
                             <div class="report-detail-box"><div class="report-detail-label">${icon("calendar", "ic-xs")} Follow-up</div><p class="small" style="color:#fff;">${r.followUp}</p><div class="xs muted mt-3">Patient ID: <span class="cyan-text">${r.patientId}</span></div></div>
                           </div>
                           <div class="mt-3">${btn({ label: `${icon("download", "ic-sm")} Download Report`, variant: "outline", size: "sm", attrs: 'data-action="print"' })}</div>
                         </div>`
                      : ""
                  }
                </div>`;
            })
            .join("");

    return `
      <div>
        <div class="dash-header" style="margin-bottom:1.25rem;">
          <h2>Patient Reports by Doctors</h2>
          <div class="flex items-center gap-2">
            <label class="small muted" for="filter-doctor">Filter by doctor:</label>
            <select class="input" id="filter-doctor" style="min-height:40px; width:auto;">${options}</select>
          </div>
        </div>
        <div class="flex flex-col gap-4">${list}</div>
      </div>
    `;
  }

  function configView() {
    const fields = [
      { label: "Daily Token Limit (per doctor)", defaultValue: "50", type: "number" },
      { label: "Token Prefix Format", defaultValue: "A, B, C...", type: "text" },
      { label: "Inactivity Auto-Cancel (minutes)", defaultValue: "15", type: "number" },
      { label: "Max Queue Size", defaultValue: "100", type: "number" },
    ];
    return `
      <div style="max-width: 36rem;" class="flex flex-col gap-4">
        <h2>Token Configuration</h2>
        ${fields.map((f) => `<div class="card card-pad"><label class="label">${f.label}</label><input class="input" type="${f.type}" value="${f.defaultValue}" /></div>`).join("")}
        <div class="card card-pad">
          <div class="flex justify-between items-center">
            <div><div class="small" style="color:#cbd5e1; font-weight:500;">Emergency Priority Queue</div><div class="xs faint mt-2">Move flagged emergency patients to front automatically</div></div>
            <button role="switch" aria-checked="true" aria-label="Toggle emergency priority" class="switch on"><span class="switch-knob"></span></button>
          </div>
        </div>
        ${btn({ label: "Save Configuration", variant: "primary", size: "md" })}
      </div>
    `;
  }

  function analyticsView() {
    const doctors = getDoctors();
    return `
      <div class="flex flex-col gap-6">
        <h2>Queue Analytics</h2>
        <div class="grid grid-2">
          <div class="chart-box"><h3>Average Wait Time by Hour</h3><canvas id="chart-waittime" height="220"></canvas></div>
          <div class="chart-box"><h3>Weekly Patient Volume</h3><canvas id="chart-weekly" height="220"></canvas></div>
        </div>
        <div class="table-wrap">
          <div style="padding:0.75rem 1rem; border-bottom:1px solid var(--border);"><h3 class="small" style="margin:0;">Doctor Performance Today</h3></div>
          <table class="data-table">
            <thead><tr><th>Doctor</th><th>Completed</th><th class="md-block hidden">Avg Wait</th><th class="md-block hidden">Rating</th></tr></thead>
            <tbody>
              ${doctors
                .filter((d) => d.available)
                .map(
                  (doc) => `
                <tr>
                  <td style="color:#fff; font-weight:500;">${doc.name}</td>
                  <td style="color:#cbd5e1;">${PATIENT_REPORTS.filter((r) => r.doctorId === doc.id).length}</td>
                  <td class="md-block hidden muted">${doc.avgWait} min</td>
                  <td class="md-block hidden"><span class="flex items-center gap-1 text-amber">${icon("star", "ic-xs")} ${doc.rating}</span></td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function render() {
    const tabs = ["overview", "doctors", "specialties", "reports", "config", "analytics"]
      .map((t) => `<button class="tab ${activeTab === t ? "active" : ""}" data-action="tab" data-tab="${t}">${t}</button>`)
      .join("");

    let body = "";
    if (activeTab === "overview") body = overviewView();
    else if (activeTab === "doctors") body = doctorsView();
    else if (activeTab === "specialties") body = specialtiesView();
    else if (activeTab === "reports") body = reportsView();
    else if (activeTab === "config") body = configView();
    else body = analyticsView();

    document.getElementById("page-root").innerHTML = `
      <div class="page">
        <div class="container">
          <div class="dash-header">
            <div>
              <h1 class="dash-title">Admin Dashboard</h1>
              <p class="small muted">Welcome, Admin · MedQueue Hospital System</p>
            </div>
            ${btn({ label: `${icon("download", "ic-base")} Export PDF`, variant: "primary", size: "sm", attrs: 'data-action="print"' })}
          </div>
          <div class="tabs">${tabs}</div>
          ${body}
        </div>
      </div>
    `;
    refreshIcons();
    wireCharts();
  }

  // ---------- Chart.js wiring ----------
  const chartBaseOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.05)" } },
    },
  };
  function makeChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas || !window.Chart) return;
    if (chartInstances[id]) chartInstances[id].destroy();
    chartInstances[id] = new window.Chart(canvas.getContext("2d"), config);
  }
  function wireCharts() {
    destroyCharts();
    if (activeTab === "overview") {
      makeChart("chart-daily", {
        type: "bar",
        data: {
          labels: analyticsData.daily.map((d) => d.day),
          datasets: [
            { label: "Patients", data: analyticsData.daily.map((d) => d.patients), backgroundColor: "#06b6d4", borderRadius: 6 },
            { label: "Completed", data: analyticsData.daily.map((d) => d.completed), backgroundColor: "#10b981", borderRadius: 6 },
          ],
        },
        options: chartBaseOptions,
      });
      makeChart("chart-specialty", {
        type: "doughnut",
        data: { labels: analyticsData.specialties.map((s) => s.name), datasets: [{ data: analyticsData.specialties.map((s) => s.value), backgroundColor: CHART_COLORS }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });
    } else if (activeTab === "analytics") {
      makeChart("chart-waittime", {
        type: "line",
        data: { labels: analyticsData.waitTimes.map((w) => w.hour), datasets: [{ label: "Wait (min)", data: analyticsData.waitTimes.map((w) => w.wait), borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.15)", fill: true, tension: 0.4 }] },
        options: chartBaseOptions,
      });
      makeChart("chart-weekly", {
        type: "bar",
        data: {
          labels: analyticsData.daily.map((d) => d.day),
          datasets: [
            { label: "Total", data: analyticsData.daily.map((d) => d.patients), backgroundColor: "#06b6d4", borderRadius: 6 },
            { label: "Completed", data: analyticsData.daily.map((d) => d.completed), backgroundColor: "#10b981", borderRadius: 6 },
          ],
        },
        options: chartBaseOptions,
      });
    }
  }

  // ---------- Events ----------
  document.getElementById("page-root").addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    const doctors = getDoctors();
    const specialties = getSpecialties();

    if (action === "tab") { activeTab = el.dataset.tab; render(); }
    else if (action === "toggle-add-doctor") { showAddDoctor = !showAddDoctor; editingDoctor = null; render(); }
    else if (action === "add-doctor") {
      const name = document.getElementById("new-doc-name")?.value.trim() || "";
      const specialty = document.getElementById("new-doc-specialty")?.value || specialties[0];
      const room = document.getElementById("new-doc-room")?.value.trim() || "";
      const photoUrl = document.getElementById("new-doc-photo")?.value.trim() || "";
      if (!name || !room) return;
      const randomPhoto = UNSPLASH_DOCTOR_PHOTOS[Math.floor(Math.random() * UNSPLASH_DOCTOR_PHOTOS.length)];
      doctors.push({ id: `d${Date.now()}`, name, specialty, room, available: true, queueCount: 0, avgWait: 10, rating: 4.5, photo: photoUrl || randomPhoto });
      setDoctors(doctors);
      showAddDoctor = false;
      render();
    }
    else if (action === "start-edit-doctor") {
      editingDoctor = { ...doctors.find((d) => d.id === el.dataset.id) };
      showAddDoctor = false;
      render();
    }
    else if (action === "cancel-edit-doctor") { editingDoctor = null; render(); }
    else if (action === "toggle-editing-available") { editingDoctor.available = !editingDoctor.available; render(); }
    else if (action === "save-edit-doctor") {
      editingDoctor.name = document.getElementById("edit-doc-name")?.value || editingDoctor.name;
      editingDoctor.specialty = document.getElementById("edit-doc-specialty")?.value || editingDoctor.specialty;
      editingDoctor.room = document.getElementById("edit-doc-room")?.value || editingDoctor.room;
      editingDoctor.avgWait = Number(document.getElementById("edit-doc-wait")?.value) || editingDoctor.avgWait;
      editingDoctor.photo = document.getElementById("edit-doc-photo")?.value || editingDoctor.photo;
      const idx = doctors.findIndex((d) => d.id === editingDoctor.id);
      if (idx !== -1) doctors[idx] = editingDoctor;
      setDoctors(doctors);
      editingDoctor = null;
      render();
    }
    else if (action === "remove-doctor") { setDoctors(doctors.filter((d) => d.id !== el.dataset.id)); render(); }
    else if (action === "pick-quick-photo") {
      const input = document.getElementById("new-doc-photo");
      if (input) input.value = el.dataset.photo;
    }
    else if (action === "modal-backdrop") { if (e.target === el) { editingDoctor = null; render(); } }
    else if (action === "start-edit-specialty") { editingSpecialty = { index: Number(el.dataset.index), value: specialties[Number(el.dataset.index)] }; render(); }
    else if (action === "cancel-edit-specialty") { editingSpecialty = null; render(); }
    else if (action === "save-edit-specialty") {
      const val = document.getElementById("edit-specialty-input")?.value.trim();
      if (!editingSpecialty || !val) return;
      const oldName = specialties[editingSpecialty.index];
      specialties[editingSpecialty.index] = val;
      setSpecialties(specialties);
      const updatedDoctors = doctors.map((d) => (d.specialty === oldName ? { ...d, specialty: val } : d));
      setDoctors(updatedDoctors);
      editingSpecialty = null;
      render();
    }
    else if (action === "toggle-add-specialty") { showAddSpecialty = !showAddSpecialty; render(); }
    else if (action === "add-specialty") {
      const val = document.getElementById("new-specialty-input")?.value.trim();
      if (!val || specialties.includes(val)) return;
      specialties.push(val);
      setSpecialties(specialties);
      showAddSpecialty = false;
      render();
    }
    else if (action === "remove-specialty") { specialties.splice(Number(el.dataset.index), 1); setSpecialties(specialties); render(); }
    else if (action === "toggle-report") { expandedReport = expandedReport === el.dataset.id ? null : el.dataset.id; render(); }
    else if (action === "print") { window.print(); }
  });

  document.getElementById("page-root").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "new-specialty-input") {
      e.preventDefault();
      document.querySelector('[data-action="add-specialty"]')?.click();
    }
  });

  document.getElementById("page-root").addEventListener("change", (e) => {
    if (e.target.id === "filter-doctor") { selectedReportDoctor = e.target.value; render(); }
  });

  render();
}
