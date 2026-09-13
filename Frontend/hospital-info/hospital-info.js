import { icon, refreshIcons } from "../shared/icons.js";
import { mountNav } from "../shared/nav.js";

mountNav("hospital-info");

const DEPARTMENTS = [
  { icon: "heart", name: "Cardiology", floor: "2nd Floor", rooms: "201–215" },
  { icon: "activity", name: "Neurology", floor: "3rd Floor", rooms: "301–318" },
  { icon: "user", name: "Pediatrics", floor: "1st Floor", rooms: "102–120" },
  { icon: "stethoscope", name: "General Medicine", floor: "1st Floor", rooms: "101" },
  { icon: "shield", name: "Orthopedics", floor: "4th Floor", rooms: "401–420" },
  { icon: "star", name: "Dermatology", floor: "2nd Floor", rooms: "208–212" },
  { icon: "bell", name: "ENT", floor: "3rd Floor", rooms: "316–322" },
  { icon: "alert-triangle", name: "Emergency", floor: "Ground Floor", rooms: "ER-01–ER-20", danger: true },
];

document.getElementById("page-root").innerHTML = `
  <div class="page">
    <div class="container">
      <div class="mb-8">
        <h1 class="hero-title" style="font-size: clamp(2rem, 4vw, 3rem); margin-bottom: 0.5rem;">Hospital Information</h1>
        <p class="muted">Everything you need to know before your visit.</p>
      </div>

      <div class="grid" id="info-grid">
        <div id="info-departments">
          <h2 style="margin-bottom:1rem;">Departments</h2>
          <div class="grid grid-2">
            ${DEPARTMENTS.map(
              (d) => `
              <div class="card card-pad flex gap-3">
                <div class="feature-icon" style="margin-bottom:0; flex-shrink:0; ${d.danger ? "color:var(--red);" : ""}">${icon(d.icon, "ic-md")}</div>
                <div>
                  <div style="font-weight:600; color:#fff; font-size:0.875rem; font-family:var(--font-heading);">${d.name}</div>
                  <div class="xs muted">${d.floor} · Rooms ${d.rooms}</div>
                </div>
              </div>`
            ).join("")}
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div class="card card-pad">
            <div class="flex items-center gap-2 mb-3 cyan-text" style="font-weight:600;">${icon("clock", "ic-base")} Opening Hours</div>
            <div class="small" style="color:#cbd5e1;">
              <div class="flex justify-between mt-2"><span>Mon–Fri</span><span>7:00 AM – 8:00 PM</span></div>
              <div class="flex justify-between mt-2"><span>Saturday</span><span>8:00 AM – 4:00 PM</span></div>
              <div class="flex justify-between mt-2"><span>Sunday</span><span>9:00 AM – 2:00 PM</span></div>
              <div class="flex justify-between mt-2 text-red"><span>Emergency</span><span>24 / 7</span></div>
            </div>
          </div>

          <div class="card card-pad">
            <div class="flex items-center gap-2 mb-3 cyan-text" style="font-weight:600;">${icon("phone", "ic-base")} Contact</div>
            <div class="small" style="color:#cbd5e1;">
              <div class="mt-2">Reception: +1 (555) 100-2000</div>
              <div class="mt-2">Emergency: +1 (555) 911-0000</div>
              <div class="mt-2">Email: info@medqueue.hospital</div>
            </div>
          </div>

          <div class="card card-pad">
            <div class="flex items-center gap-2 mb-3 cyan-text" style="font-weight:600;">${icon("map-pin", "ic-base")} Location</div>
            <div class="small" style="color:#cbd5e1;">
              1420 MedCenter Boulevard<br />
              Suite 100, New Delhi – 110001<br />
              <span class="faint">Near Metro Station Exit 4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
refreshIcons();
