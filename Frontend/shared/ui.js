// Small building blocks used across every page. Each function returns
// an HTML string, the same way the original app's Btn/Badge/CyanGlow
// components returned JSX.

export function cyanGlow(className = "") {
  return `<div class="section-glow ${className}" aria-hidden="true"></div>`;
}

const BADGE_VARIANTS = ["default", "emergency", "success", "warning", "muted"];

export function badge(text, variant = "default", extraHtml = "") {
  const v = BADGE_VARIANTS.includes(variant) ? variant : "default";
  return `<span class="badge badge-${v}">${extraHtml}${text}</span>`;
}

// btn() builds either a real <a href="..."> (for page-to-page navigation
// — a plain link, no JavaScript required to follow it) or a <button>
// (for an in-page action). Pass `href` for the former; otherwise pass
// `attrs` with a data-* attribute that this page's own click handler
// reads, most commonly `data-action="..."`.
export function btn({ label, variant = "primary", size = "md", block = false, disabled = false, type = "button", attrs = "", ariaLabel = "", href = "" }) {
  const classes = ["btn", `btn-${variant}`, `btn-${size}`, block ? "btn-block" : ""].filter(Boolean).join(" ");
  const aria = ariaLabel ? `aria-label="${ariaLabel}"` : "";
  if (href) {
    return `<a href="${href}" class="${classes}" ${aria} ${attrs}>${label}</a>`;
  }
  return `<button type="${type}" class="${classes}" ${disabled ? "disabled" : ""} ${aria} ${attrs}>${label}</button>`;
}
