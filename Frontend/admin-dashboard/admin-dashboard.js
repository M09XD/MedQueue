import { icon, refreshIcons } from "../shared/icons.js";
import { badge, btn, esc, fmtDateTime } from "../shared/ui.js";
import { CHART_COLORS } from "../shared/data.js";
import * as api from "../shared/api.js";
import { mountNav } from "../shared/nav.js";

api.requireRole("admin").then((user) => {
  if (!user) return;
  mountNav("admin-dashboard");
  boot();
});

function boot() {
  let activeTab = "overview"; // overview | reports | analytics
  let loading = false;
  let notice = "";
  const data = { analytics: null, reports: null };
  let expandedReportId = null;
  let expandedFullReport = null;
  let charts = {};

  async function guardedLoad(task) {
    if (loading) return;
    loading = true;
    notice = "";
    render();
    try {
      await task();
    } catch (err) {
      if (!api.handleAuthError(err)) notice = err.message;
    } finally {
      loading = false;
      render();
    }
  }

  async function ensureTab(tab) {
    if ((tab === "overview" || tab === "analytics") && !data.analytics) {
      data.analytics = await api.fetchAdminAnalytics();
    }
    if (tab === "reports" && !data.reports) {
      data.reports = await api.fetchAdminReports();
    }
  }

  function overviewView() {
    if (!data.analytics) return "";
    const s = data.analytics.summary;
    const cards = [
      { label: "Patients Today", value: s.todayPatients, iconName: "users" },
      { label: "Active Doctors", value: s.activeDoctors, iconName: "stethoscope" },
      { label: "Avg Wait (7d)", value: s.avgWaitMinutes === null ? "—" : `${s.avgWaitMinutes} min`, iconName: "clock" },
      { label: "Tokens Today", value: s.tokensGenerated, iconName: "file-text" },
    ];

    return `
      <div class="flex flex-col gap-6">
        <div class="grid grid-4">
          ${cards.map((c) => `
            <div class="card card-pad">
              <div class="feature-icon" style="margin-bottom:.75rem;">${icon(c.iconName, "ic-md")}</div>
              <div style="font-size:1.5rem; font-weight:700; color:#fff; font-family:var(--font-heading);">${esc(c.value)}</div>
              <div class="xs muted">${c.label}</div>
            </div>`).join("")}
        </div>
        <div class="grid grid-2">
          <div class="chart-box"><h3>Daily Patients (Last 7 Days)</h3>
            ${data.analytics.dailyVolume.length ? `<canvas id="chart-daily" height="220"></canvas>` : `<p class="small faint">No queue activity yet.</p>`}
          </div>
          <div class="chart-box"><h3>Specialty Distribution (30 Days)</h3>
            ${data.analytics.specialtyDistribution.length ? `<canvas id="chart-specialty" height="220"></canvas>` : `<p class="small faint">No queue activity yet.</p>`}
          </div>
        </div>
      </div>`;
  }

  function reportsView() {
    const reports = data.reports || [];
    if (!reports.length) {
      return `<div class="empty">${icon("file-text", "ic-xl")}<p class="small">No reports found.</p></div>`;
    }

    return `<div class="flex flex-col gap-4">
      <p class="xs faint">Report metadata comes from backend. Full report access is permission-gated and audited.</p>
      ${reports.map((r) => {
        const isOpen = expandedReportId === r.id;
        return `<div class="report-item ${isOpen ? "expanded" : ""}">
          <button class="report-header" data-action="toggle-report" data-id="${Number(r.id)}" aria-expanded="${isOpen}">
            <div style="text-align:left; min-width:0;">
              <div class="small" style="font-weight:600; color:#fff;">${esc(r.patientName || "Patient")}</div>
              <div class="xs muted">${esc(r.patientCode || "—")} · ${esc(r.doctorName || "Doctor")} · ${fmtDateTime(r.updatedAt)}</div>
            </div>
            <span class="chevron ${isOpen ? "rotated" : ""}">${icon("chevron-down", "ic-base")}</span>
          </button>
          ${isOpen ? `<div class="report-body">${
            expandedFullReport === "loading" ? `<p class="small muted">Loading…</p>` :
            expandedFullReport === "denied" ? `<p class="small text-red">No permission to read full report.</p>` :
            expandedFullReport ? `
              <div class="grid grid-3">
                <div class="report-detail-box"><div class="report-detail-label">Diagnosis</div><p class="small" style="color:#fff;">${esc(expandedFullReport.diagnosis)}</p></div>
                <div class="report-detail-box"><div class="report-detail-label">Prescription</div><p class="small" style="color:#fff;">${esc(expandedFullReport.prescription)}</p></div>
                <div class="report-detail-box"><div class="report-detail-label">Follow-up</div><p class="small" style="color:#fff;">${esc(expandedFullReport.followUp || "—")}</p></div>
              </div>` : ""
          }</div>` : ""}
        </div>`;
      }).join("")}
    </div>`;
  }

  function analyticsView() {
    if (!data.analytics) return "";
    return `<div class="flex flex-col gap-6">
      <div class="grid grid-2">
        <div class="chart-box"><h3>Average Wait by Hour (last 24h)</h3>
          ${data.analytics.hourlyWaitTrend.length ? `<canvas id="chart-wait" height="220"></canvas>` : `<p class="small faint">No called-patient data yet.</p>`}
        </div>
        <div class="chart-box"><h3>Weekly Patient Volume</h3>
          ${data.analytics.dailyVolume.length ? `<canvas id="chart-weekly" height="220"></canvas>` : `<p class="small faint">No queue activity yet.</p>`}
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Doctor</th><th>Completed</th><th>Waiting</th><th>Status</th></tr></thead>
          <tbody>${data.analytics.doctorPerformance.map((d) => `<tr>
            <td style="color:#fff; font-weight:500;">${esc(d.name)}</td>
            <td>${Number(d.completed)}</td>
            <td>${Number(d.waiting)}</td>
            <td>${badge(d.available ? "On shift" : "Off shift", d.available ? "success" : "warning")}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>`;
  }

  function renderCharts() {
    Object.values(charts).forEach((c) => c?.destroy());
    charts = {};
    if (!window.Chart || !data.analytics) return;

    const base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    };

    const dailyData = {
      labels: data.analytics.dailyVolume.map((d) => d.day),
      datasets: [
        { label: "Tokens", data: data.analytics.dailyVolume.map((d) => d.total), backgroundColor: "#06b6d4", borderRadius: 6 },
        { label: "Completed", data: data.analytics.dailyVolume.map((d) => d.completed), backgroundColor: "#10b981", borderRadius: 6 },
      ],
    };

    function chart(id, config) {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      charts[id] = new window.Chart(canvas.getContext("2d"), config);
    }

    if (activeTab === "overview") {
      chart("chart-daily", { type: "bar", data: dailyData, options: base });
      chart("chart-specialty", {
        type: "doughnut",
        data: {
          labels: data.analytics.specialtyDistribution.map((s) => s.name),
          datasets: [{ data: data.analytics.specialtyDistribution.map((s) => s.total), backgroundColor: CHART_COLORS }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });
    }

    if (activeTab === "analytics") {
      chart("chart-weekly", { type: "bar", data: dailyData, options: base });
      chart("chart-wait", {
        type: "line",
        data: {
          labels: data.analytics.hourlyWaitTrend.map((x) => x.hour),
          datasets: [{ label: "Wait", data: data.analytics.hourlyWaitTrend.map((x) => x.avgWait), borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.12)", fill: true, tension: 0.35 }],
        },
        options: base,
      });
    }
  }

  function render() {
    const tabs = ["overview", "reports", "analytics"].map((t) => `<button class="tab ${activeTab === t ? "active" : ""}" data-action="tab" data-tab="${t}">${t}</button>`).join("");
    const body = activeTab === "overview" ? overviewView() : activeTab === "reports" ? reportsView() : analyticsView();

    document.getElementById("page-root").innerHTML = `
      <div class="page"><div class="container">
        <div class="dash-header">
          <div><h1 class="dash-title">Admin Dashboard</h1><p class="small muted">Server-authoritative analytics and reports</p></div>
          ${btn({ label: `${icon("download", "ic-base")} Print`, variant: "primary", size: "sm", attrs: 'data-action="print"' })}
        </div>
        <div class="tabs">${tabs}</div>
        ${notice ? `<p class="error-banner" role="alert" style="margin-bottom:1rem;">${icon("alert-triangle", "ic-sm")} ${esc(notice)}</p>` : ""}
        ${loading && !body ? `<p class="small muted">Loading…</p>` : body}
      </div></div>`;

    refreshIcons();
    renderCharts();
  }

  const root = document.getElementById("page-root");
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;

    if (action === "print") {
      window.print();
      return;
    }

    if (action === "tab") {
      activeTab = el.dataset.tab;
      guardedLoad(() => ensureTab(activeTab));
      return;
    }

    if (action === "toggle-report") {
      const id = Number(el.dataset.id);
      if (expandedReportId === id) {
        expandedReportId = null;
        expandedFullReport = null;
        render();
        return;
      }
      expandedReportId = id;
      expandedFullReport = "loading";
      render();
      guardedLoad(async () => {
        try {
          expandedFullReport = await api.fetchAdminReport(id);
        } catch (err) {
          if (err?.status === 403) expandedFullReport = "denied";
          else throw err;
        }
      });
    }
  });

  guardedLoad(async () => {
    await ensureTab("overview");
  });
}
