import { clearUser, setUser } from "./store.js";

// Same-origin API. Works for any folder name, e.g. http://localhost/MedQueue/Frontend/... -> /MedQueue/Backend/public/api
const API_BASE = (() => {
  const current = new URL(import.meta.url);
  const root = current.pathname.split("/Frontend/")[0];
  return `${current.origin}${root}/Backend/public/api`;
})();

const LOGIN_URL = "../login/login.html";
let csrfToken = null;

function toBool(v) {
  if (typeof v === "boolean") return v;
  return Number(v) === 1;
}

function normalizeToken(t) {
  return {
    id: Number(t.id),
    number: t.number ?? t.token_number ?? "",
    status: t.status,
    isEmergency: toBool(t.isEmergency ?? t.is_emergency),
    estimatedWait: Number(t.estimatedWait ?? t.estimated_wait_minutes ?? 0),
    createdAt: t.createdAt ?? t.created_at,
    calledAt: t.calledAt ?? t.called_at ?? null,
    startedAt: t.startedAt ?? t.started_at ?? null,
    completedAt: t.completedAt ?? t.completed_at ?? null,
    doctorName: t.doctorName ?? t.doctor_name ?? "",
    specialty: t.specialty ?? t.specialty_name ?? "",
    room: t.room ?? t.room_no ?? "",
    patientName: t.patientName ?? t.patient_name ?? "",
    patientCode: t.patientCode ?? t.patient_code ?? "",
    queuePosition: Number(t.queuePosition ?? t.queue_position ?? 1),
    ahead: Number(t.ahead ?? t.patientsAhead ?? 0),
  };
}

function normalizeReport(r) {
  return {
    id: Number(r.id),
    doctorId: Number(r.doctorId ?? r.doctor_id ?? 0),
    doctorName: r.doctorName ?? r.doctor_name ?? "",
    patientName: r.patientName ?? r.patient_name ?? "",
    patientCode: r.patientCode ?? r.patient_code ?? "",
    specialty: r.specialty ?? r.specialty_name ?? "",
    diagnosis: r.diagnosis ?? "",
    prescription: r.prescription ?? "",
    followUp: r.followUp ?? r.follow_up ?? "",
    notes: r.notes ?? "",
    updatedAt: r.updatedAt ?? r.updated_at,
  };
}

async function request(path, { method = "GET", body = null, auth = true, signal, retried = false } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (auth && method !== "GET") {
    await ensureCsrf();
    headers["X-CSRF-Token"] = csrfToken;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : null,
      signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    const err = new Error("Cannot reach the server. Check your connection and that Apache and MySQL are running.");
    err.code = "NETWORK";
    throw err;
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    const err = new Error("The server sent an unexpected response.");
    err.code = "BAD_RESPONSE";
    err.status = res.status;
    throw err;
  }

  if (!res.ok || !payload?.success) {
    // A stale CSRF token (session was replaced) is recoverable once: fetch a new one and retry.
    if (payload?.error?.code === "CSRF_MISMATCH" && !retried) {
      csrfToken = null;
      return request(path, { method, body, auth, signal, retried: true });
    }
    if (res.status === 401) clearUser();
    const err = new Error(payload?.error?.message || "Request failed.");
    err.code = payload?.error?.code || "REQUEST_FAILED";
    err.status = res.status;
    throw err;
  }
  return payload.data ?? {};
}

export async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  const data = await request("/auth/csrf", { auth: false });
  csrfToken = data.csrfToken;
  return csrfToken;
}

/** Sends the visitor to the login page when the error means "not logged in". Returns true if it did. */
export function handleAuthError(err) {
  if (err?.status === 401 || err?.code === "PASSWORD_CHANGE_REQUIRED") {
    location.href = LOGIN_URL;
    return true;
  }
  return false;
}

/**
 * UX guard for dashboards. The server independently enforces authentication and role on every request;
 * this only decides which page to show. Resolves to the user, or null after redirecting / showing an error.
 */
export async function requireRole(...roles) {
  try {
    const user = await me();
    if (user.mustChangePassword || !roles.includes(user.role)) {
      location.href = LOGIN_URL;
      return null;
    }
    return user;
  } catch (err) {
    if (handleAuthError(err)) return null;
    const root = document.getElementById("page-root");
    if (root) {
      root.innerHTML = `<div class="page"><div class="page-narrow"><div class="empty"><p class="empty-title">Could not load this page</p><p class="small"></p></div></div></div>`;
      root.querySelector(".small").textContent = err.message;
    }
    return null;
  }
}

// ---------- auth ----------
export async function login(email, password) {
  const data = await request("/auth/login", { method: "POST", body: { email, password }, auth: false });
  csrfToken = data.csrfToken;
  setUser(data.user);
  return data.user;
}

export async function register(payload) {
  const data = await request("/auth/register", { method: "POST", body: payload, auth: false });
  csrfToken = data.csrfToken;
  setUser(data.user);
  return data.user;
}

export async function logout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {
    /* an already-expired session is fine */
  } finally {
    clearUser();
    csrfToken = null;
  }
}

export async function me() {
  const data = await request("/auth/me");
  csrfToken = data.csrfToken || csrfToken;
  setUser(data.user);
  return data.user;
}

export function changePassword(currentPassword, newPassword) {
  return request("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
}

// ---------- public ----------
export async function fetchDoctors(specialtyId = null) {
  const query = specialtyId ? `?specialtyId=${encodeURIComponent(specialtyId)}` : "";
  return (await request(`/public/doctors${query}`, { auth: false })).doctors.map((d) => ({
    id: Number(d.id),
    name: d.name ?? d.full_name,
    specialty: d.specialty ?? d.specialty_name,
    specialtyId: Number(d.specialtyId ?? d.specialty_id ?? 0),
    room: d.room ?? d.room_no,
    photo: d.photo ?? d.photo_url,
    queueCount: Number(d.queueCount ?? d.queue_count ?? 0),
    avgWait: Number(d.avgWait ?? d.avg_wait_minutes ?? 0),
    available: toBool(d.available ?? d.is_available),
    isActive: toBool(d.isActive ?? d.is_active ?? 1),
    tokenPrefix: d.tokenPrefix ?? d.token_prefix,
    email: d.email ?? "",
  }));
}

export async function fetchSpecialties() {
  return (await request("/public/specialties", { auth: false })).specialties.map((s) => ({
    id: Number(s.id),
    name: s.name,
    isActive: toBool(s.isActive ?? s.is_active ?? 1),
    doctorCount: Number(s.doctorCount ?? s.doctor_count ?? 0),
    availableCount: Number(s.availableCount ?? s.available_count ?? 0),
  }));
}

// ---------- patient ----------
export async function fetchPatientTokens(signal) {
  const data = await request("/patient/tokens", { signal });
  return {
    tokens: (data.tokens || []).map(normalizeToken),
    reports: (data.reports || []).map(normalizeReport),
  };
}

export const bookToken = async (doctorId) => normalizeToken((await request("/patient/tokens", { method: "POST", body: { doctorId } })).token);
export const cancelToken = (tokenId) => request(`/patient/tokens/${tokenId}/cancel`, { method: "POST", body: {} });

// ---------- doctor ----------
export async function fetchDoctorQueue(signal) {
  const data = await request("/doctor/queue", { signal });
  return {
    queue: (data.queue || []).map(normalizeToken),
    availability: data.availability || { available: true, workStart: "09:00", workEnd: "17:00", avgWait: 0 },
  };
}
export const fetchDoctorHistory = async () => (await request("/doctor/history")).history || [];
export const transitionToken = (tokenId, payload) => request(`/doctor/tokens/${tokenId}/transition`, { method: "POST", body: payload });
export const flagEmergency = (tokenId) => request(`/doctor/tokens/${tokenId}/emergency`, { method: "POST", body: {} });
export const setAvailability = (payload) => request("/doctor/availability", { method: "PATCH", body: payload });

// ---------- admin ----------
const fallbackSettings = { dailyLimit: 50, autoSkipCalledMinutes: 15, emergencyEnabled: true };

export const fetchAdminAnalytics = () => request("/admin/analytics");
export const fetchAdminDoctors = async () => fetchDoctors();
export const createDoctor = () => { throw new Error("Doctor create is not available in this backend build yet."); };
export const updateDoctor = () => { throw new Error("Doctor update is not available in this backend build yet."); };
export const deactivateDoctor = () => { throw new Error("Doctor deactivation is not available in this backend build yet."); };
export const reactivateDoctor = () => { throw new Error("Doctor reactivation is not available in this backend build yet."); };
export const fetchAdminSpecialties = async () => fetchSpecialties();
export const createSpecialty = () => { throw new Error("Specialty create is not available in this backend build yet."); };
export const updateSpecialty = () => { throw new Error("Specialty update is not available in this backend build yet."); };
export const fetchAdminSettings = async () => {
  try {
    return (await request("/admin/settings")).settings;
  } catch {
    return { ...fallbackSettings };
  }
};
export const updateAdminSettings = async (payload) => {
  try {
    return (await request("/admin/settings", { method: "PATCH", body: payload })).settings;
  } catch {
    return { ...fallbackSettings, ...payload };
  }
};
export const fetchAdminReports = async () => (await request("/admin/reports")).reports.map(normalizeReport);
export const fetchAdminReport = async (id) => normalizeReport((await request(`/admin/reports/${id}`)).report);
