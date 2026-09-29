import { icon } from "./icons.js";
import { badge, btn, esc, photoSrc } from "./ui.js";

// Pass either:
//  - action: a data-action name your page's click handler reads (plus data-doctor-id), or
//  - href: a real URL for a plain link.
export function doctorCard(doc, { compact = false, action = "", href = "" } = {}) {
  const statusBadge = doc.available ? badge("Available", "success") : badge("Unavailable", "warning");

  const stats = compact
    ? `<div class="doctor-stats"><span>${icon("clock", "ic-xs")} ~${Number(doc.avgWait)}m</span></div>`
    : `<div class="doctor-stats">
         <span>${icon("clock", "ic-xs")} ~${Number(doc.avgWait)}m wait</span>
         <span>${icon("users", "ic-xs")} ${Number(doc.queueCount)} in queue</span>
       </div>`;

  return `
    <div class="doctor-card" data-tilt>
      <div class="doctor-photo-wrap">
        <img src="${esc(photoSrc(doc.photo))}" alt="Portrait of ${esc(doc.name)}" loading="lazy" />
        <div class="doctor-photo-shade" aria-hidden="true"></div>
        <div class="doctor-photo-badge">${statusBadge}</div>
      </div>
      <div class="doctor-card-body">
        <div class="doctor-name">${esc(doc.name)}</div>
        <div class="doctor-meta">${esc(doc.specialty)} · ${esc(doc.room)}</div>
        ${stats}
        ${btn({
          label: doc.available ? "Get Token" : "Unavailable",
          variant: doc.available ? "primary" : "ghost",
          size: "sm",
          block: true,
          disabled: !doc.available,
          href: doc.available ? href : "",
          attrs: action ? `data-action="${esc(action)}" data-doctor-id="${Number(doc.id)}"` : "",
        })}
      </div>
    </div>
  `;
}
