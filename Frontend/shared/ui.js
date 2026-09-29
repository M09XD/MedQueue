// Small building blocks used across every page. Each function returns an HTML string.
// Anything that came from the server or a user MUST go through esc() before it is put into a template.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function cyanGlow(className = "") {
  return `<div class="section-glow ${className}" aria-hidden="true"></div>`;
}

const BADGE_VARIANTS = ["default", "emergency", "success", "warning", "muted"];

/** `text` is escaped; `extraHtml` (an icon) is trusted markup. */
export function badge(text, variant = "default", extraHtml = "") {
  const v = BADGE_VARIANTS.includes(variant) ? variant : "default";
  return `<span class="badge badge-${v}">${extraHtml}${esc(text)}</span>`;
}

// btn() builds either a real <a href> (page navigation) or a <button> (in-page action, via data-* attrs).
// `label` and `attrs` are trusted markup: escape any dynamic value before passing it in.
export function btn({ label, variant = "primary", size = "md", block = false, disabled = false, type = "button", attrs = "", ariaLabel = "", href = "" }) {
  const classes = ["btn", `btn-${variant}`, `btn-${size}`, block ? "btn-block" : ""].filter(Boolean).join(" ");
  const aria = ariaLabel ? `aria-label="${esc(ariaLabel)}"` : "";
  if (href) return `<a href="${esc(href)}" class="${classes}" ${aria} ${attrs}>${label}</a>`;
  return `<button type="${type}" class="${classes}" ${disabled ? "disabled" : ""} ${aria} ${attrs}>${label}</button>`;
}

/** Doctor photo: accepts a full https URL or a bare Unsplash photo id. */
export function photoSrc(photo, size = "w=400&h=300") {
  if (!photo) return "";
  return /^https:\/\//i.test(photo) ? photo : `https://images.unsplash.com/${encodeURIComponent(photo)}?${size}&fit=crop&auto=format`;
}

// Server timestamps are UTC ("YYYY-MM-DD HH:MM:SS"); show them in the visitor's local time.
export function parseUtc(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}
export function fmtTime(value) {
  const d = parseUtc(value);
  return d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
}
export function fmtDateTime(value) {
  const d = parseUtc(value);
  return d ? d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}
