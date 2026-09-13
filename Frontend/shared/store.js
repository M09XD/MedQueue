// Every page here is a real, separate HTML file (a real multi-page site,
// not a single-page app), so a plain in-memory JS object can't hold
// state between pages — the browser throws it away on every navigation.
// localStorage is the plain, built-in way to keep a few small things
// (who's logged in, the doctor list) around between page loads.
//
// Everything is stored as JSON text under one key per piece of data.

import { INITIAL_DOCTORS, SPECIALTIES } from "./data.js";

const KEYS = {
  user: "medqueue.user",           // { role, profile }
  doctors: "medqueue.doctors",     // Doctor[]
  specialties: "medqueue.specialties", // string[]
  pendingDoctorId: "medqueue.pendingDoctorId",
  patientTokens: "medqueue.patientTokens", // QueueToken[]
  doctorSession: "medqueue.doctorSession", // { [doctorId]: {...} }
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

// ---------- Logged-in user ----------
export function getUser() {
  return readJSON(KEYS.user, null); // { role: "patient"|"doctor"|"admin", profile: {...} } | null
}
export function setUser(role, profile) {
  writeJSON(KEYS.user, { role, profile });
}
export function clearUser() {
  localStorage.removeItem(KEYS.user);
}

// ---------- Doctors (mutable — Admin can add/edit/remove) ----------
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

// ---------- Specialties (mutable — Admin can add/rename/remove) ----------
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

// ---------- "Get Token" handoff from the Doctors page to Patient Dashboard ----------
export function getPendingDoctorId() {
  return readJSON(KEYS.pendingDoctorId, null);
}
export function setPendingDoctorId(id) {
  writeJSON(KEYS.pendingDoctorId, id);
}
export function clearPendingDoctorId() {
  localStorage.removeItem(KEYS.pendingDoctorId);
}

// ---------- Patient's active queue tokens ----------
export function getPatientTokens() {
  return readJSON(KEYS.patientTokens, []);
}
export function setPatientTokens(list) {
  writeJSON(KEYS.patientTokens, list);
}

// ---------- Doctor's in-progress queue/session (keyed by doctor id, so
// revisiting the Doctor Dashboard page continues the same shift) ----------
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

// Send a not-logged-in visitor to the login page, remembering nothing
// fancy — this mirrors a plain server-side "login required" redirect.
export function requireRole(...allowedRoles) {
  const user = getUser();
  if (!user || !allowedRoles.includes(user.role)) {
    location.href = "../login/login.html";
    return null;
  }
  return user;
}
