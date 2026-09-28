import { clearUser, setUser } from "./store.js";

const API_BASE = (() => {
  const current = new URL(import.meta.url);
  const root = current.pathname.split("/Frontend/")[0];
  return `${current.origin}${root}/Backend/public/api`;
})();

let csrfToken = null;

async function request(path, { method = "GET", body = null, auth = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && method !== "GET") {
    await ensureCsrf();
    headers["X-CSRF-Token"] = csrfToken;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: body ? JSON.stringify(body) : null,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    throw new Error("Server returned invalid JSON");
  }

  if (!res.ok || !payload?.success) {
    const code = payload?.error?.code || "REQUEST_FAILED";
    const message = payload?.error?.message || "Request failed";

    if (res.status === 401) {
      clearUser();
    }

    const error = new Error(message);
    error.code = code;
    error.status = res.status;
    throw error;
  }

  return payload.data ?? {};
}

export async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  const data = await request("/auth/csrf", { auth: false });
  csrfToken = data.csrfToken;
  return csrfToken;
}

export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  csrfToken = data.csrfToken;
  setUser(data.user.role, data.user.profile, data.user);
  return data.user;
}

export async function register(payload) {
  const data = await request("/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });
  csrfToken = data.csrfToken;
  setUser(data.user.role, data.user.profile, data.user);
  return data.user;
}

export async function logout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    clearUser();
    csrfToken = null;
  }
}

export async function me() {
  const data = await request("/auth/me");
  setUser(data.user.role, data.user.profile, data.user);
  return data.user;
}

export async function fetchDoctors(specialtyId = null) {
  const query = specialtyId ? `?specialtyId=${encodeURIComponent(specialtyId)}` : "";
  const data = await request(`/public/doctors${query}`, { auth: false });
  return data.doctors;
}

export async function fetchSpecialties() {
  const data = await request("/public/specialties", { auth: false });
  return data.specialties;
}

export async function fetchPatientTokens() {
  const data = await request("/patient/tokens");
  return data;
}

export async function bookToken(doctorId) {
  const data = await request("/patient/tokens", {
    method: "POST",
    body: { doctorId },
  });
  return data.token;
}

export async function cancelToken(tokenId) {
  return request(`/patient/tokens/${tokenId}/cancel`, { method: "POST", body: {} });
}

export async function fetchDoctorQueue() {
  const data = await request("/doctor/queue");
  return data.queue;
}

export async function transitionToken(tokenId, payload) {
  return request(`/doctor/tokens/${tokenId}/transition`, {
    method: "POST",
    body: payload,
  });
}

export async function fetchAdminAnalytics() {
  const data = await request("/admin/analytics");
  return data;
}

export async function fetchAdminReports() {
  const data = await request("/admin/reports");
  return data.reports;
}
