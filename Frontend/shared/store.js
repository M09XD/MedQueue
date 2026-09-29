// Browser storage is used ONLY for non-sensitive UX hints. The server session (HttpOnly cookie)
// is the real source of truth; nothing here grants access to anything.

const KEYS = {
  user: "medqueue.user", // { role, name } - lets the nav bar draw the right links before the server answers
  pendingDoctorId: "medqueue.pendingDoctorId", // Doctors page -> Patient Dashboard hand-off
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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode / quota): the app still works, just without the hint */
  }
}

export function getUser() {
  return readJSON(KEYS.user, null);
}

export function setUser(user) {
  writeJSON(KEYS.user, { role: user.role, name: user.profile?.name ?? "" });
}

export function clearUser() {
  try {
    localStorage.removeItem(KEYS.user);
  } catch {
    /* ignore */
  }
}

export function getPendingDoctorId() {
  return readJSON(KEYS.pendingDoctorId, null);
}

export function setPendingDoctorId(id) {
  writeJSON(KEYS.pendingDoctorId, id);
}

export function clearPendingDoctorId() {
  try {
    localStorage.removeItem(KEYS.pendingDoctorId);
  } catch {
    /* ignore */
  }
}
