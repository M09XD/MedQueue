import { icon } from "./icons.js";
import { badge, btn } from "./ui.js";

// Pass either:
//  - action: a data-action name your page's own click handler reads
//    (plus data-doctor-id), for an in-page action like booking a token, or
//  - href: a real URL, for a plain link (e.g. Homepage's preview cards
//    link straight to Register — no page-local logic needed).
export function doctorCard(doc, { compact = false, action = "", href = "" } = {}) {
  const statusBadge = doc.available
    ? badge("Available", "success")
    : badge(`Unavail. til ${doc.unavailableUntil || ""}`, "warning");

  const stats = compact
    ? `<div class="doctor-stats">
         <span>${icon("clock", "ic-xs")} ~${doc.avgWait}m</span>
         <span>${icon("star", "ic-xs", "text-amber")} ${doc.rating}</span>
       </div>`
    : `<div class="doctor-stats">
         <span>${icon("clock", "ic-xs")} ~${doc.avgWait}m wait</span>
         <span>${icon("users", "ic-xs")} ${doc.queueCount} in queue</span>
         <span>${icon("star", "ic-xs", "text-amber")} ${doc.rating}</span>
       </div>`;

  return `
    <div class="doctor-card" data-tilt>
      <div class="doctor-photo-wrap">
        <img src="https://images.unsplash.com/${doc.photo}?w=400&h=300&fit=crop&auto=format" alt="Portrait of ${doc.name}" loading="lazy" />
        <div class="doctor-photo-shade" aria-hidden="true"></div>
        <div class="doctor-photo-badge">${statusBadge}</div>
      </div>
      <div class="doctor-card-body">
        <div class="doctor-name">${doc.name}</div>
        <div class="doctor-meta">${doc.specialty} · ${doc.room}</div>
        ${stats}
        ${btn({
          label: doc.available ? "Get Token" : "Unavailable",
          variant: doc.available ? "primary" : "ghost",
          size: "sm",
          block: true,
          disabled: !doc.available,
          href: doc.available ? href : "",
          attrs: action ? `data-action="${action}" data-doctor-id="${doc.id}"` : "",
        })}
      </div>
    </div>
  `;
}
