import { INITIAL_DOCTORS, SPECIALTIES } from "./data.js";

const KEYS = {
  user: "medqueue.user", // cached session user for UX-only routing
  pendingDoctorId: "medqueue.pendingDoctorId",
  doctors: "medqueue.doctors",
  specialties: "medqueue.specialties",
  patientTokens: "medqueue.patientTokens",
  doctorSession: "medqueue.doctorSession",
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getUser() {
  return readJSON(KEYS.user, null);
}

export function setUser(role, profile, raw = null) {
  writeJSON(KEYS.user, { role, profile, raw });
}

export function clearUser() {
  localStorage.removeItem(KEYS.user);
}

// Legacy local caches retained temporarily until all pages are fully API-backed.
export function getDoctors() {
  let list = readJSON(KEYS.doctors, null);
  if (!list) {
    list = INITIAL_DOCTORS.map((d) => ({ ...d }));
    writeJSON(KEYS.doctors, list);
  }
  return list;
}

export function setDoctors(list) {
  writeJSON(KEYS.doctors, list);
}

export function getSpecialties() {
  let list = readJSON(KEYS.specialties, null);
  if (!list) {
    list = [...SPECIALTIES];
    writeJSON(KEYS.specialties, list);
  }
  return list;
}

export function setSpecialties(list) {
  writeJSON(KEYS.specialties, list);
}

export function getPendingDoctorId() {
  return readJSON(KEYS.pendingDoctorId, null);
}

export function setPendingDoctorId(id) {
  writeJSON(KEYS.pendingDoctorId, id);
}

export function clearPendingDoctorId() {
  localStorage.removeItem(KEYS.pendingDoctorId);
}

export function getPatientTokens() {
  return readJSON(KEYS.patientTokens, []);
}

export function setPatientTokens(list) {
  writeJSON(KEYS.patientTokens, list);
}

export function getDoctorSession(doctorId) {
  const all = readJSON(KEYS.doctorSession, {});
  return all[doctorId] || null;
}

export function setDoctorSession(doctorId, session) {
  const all = readJSON(KEYS.doctorSession, {});
  all[doctorId] = session;
  writeJSON(KEYS.doctorSession, all);
}

export function clearDoctorSession(doctorId) {
  const all = readJSON(KEYS.doctorSession, {});
  delete all[doctorId];
  writeJSON(KEYS.doctorSession, all);
}

export function requireRole(...allowedRoles) {
  const user = getUser();
  if (!user || !allowedRoles.includes(user.role)) {
    location.href = "../login/login.html";
    return null;
  }
  return user;
}
