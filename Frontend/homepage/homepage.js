import { icon, refreshIcons } from "../shared/icons.js";
import { badge, btn, cyanGlow } from "../shared/ui.js";
import { doctorCard } from "../shared/doctorCard.js";
import { fetchDoctors } from "../shared/api.js";
import { onParallaxScroll, attachTiltEffects } from "../shared/tilt.js";
import { mountNav } from "../shared/nav.js";

mountNav("homepage");

const FEATURES = [
  { icon: "zap", title: "Instant Token Generation", desc: "Get your digital queue token in seconds. No paperwork, no waiting in line." },
  { icon: "activity", title: "Live Queue Tracking", desc: "Your position updates automatically from the doctor's real queue, every few seconds." },
  { icon: "shield", title: "Emergency Priority", desc: "Doctors can flag urgent cases; they move to the front of the queue for everyone to see." },
  { icon: "bar-chart-3", title: "Real Analytics", desc: "Administrators see wait times, daily volume and specialty mix computed from actual queue data." },
  { icon: "bell", title: "In-App Turn Alerts", desc: "When the doctor calls you, your dashboard tells you which room to go to." },
  { icon: "users", title: "Multi-Role Access", desc: "Tailored dashboards for Patients, Doctors, and Administrators, enforced on the server." },
];

const STEPS = [
  { step: "01", title: "Register & Select Doctor", desc: "Create your account and browse available specialists by department." },
  { step: "02", title: "Generate Your Token", desc: "Receive a digital queue token with your position number in seconds." },
  { step: "03", title: "Track Your Turn", desc: "Watch your position update and see when the doctor calls you." },
  { step: "04", title: "See the Doctor", desc: "Head to the room when called. The doctor completes your visit in the system." },
];

function render(doctors) {
  const preview = doctors.filter((d) => d.available).slice(0, 4);
  document.getElementById("page-root").innerHTML = `
    <div style="overflow: hidden;">
      <section class="hero" style="perspective: 1200px;">
        <div id="px-glow" class="hero-bg-glow" aria-hidden="true"></div>
        <div id="px-blob-a" class="hero-blob-a" aria-hidden="true"></div>
        <div id="px-blob-b" class="hero-blob-b" aria-hidden="true"></div>
        <div id="px-grid" class="hero-grid" aria-hidden="true"></div>
        <div id="px-heart" class="hero-float hero-float-a" aria-hidden="true">${icon("heart", "ic-hero")}</div>
        <div id="px-stetho" class="hero-float hero-float-b" aria-hidden="true">${icon("stethoscope", "ic-hero")}</div>
        <div id="px-hero-content" class="hero-content">
          <div class="hero-pill">${icon("zap", "ic-sm")} Smart Hospital Queue System</div>
          <h1 class="hero-title">No More <span class="accent">Waiting</span><br />in the Dark</h1>
          <p class="hero-sub">Digital queue management for hospitals. Know your position, track your wait, and see when it is your turn — all from your phone.</p>
          <div class="hero-actions">
            ${btn({ label: `Get Started Free ${icon("chevron-right", "ic-md")}`, variant: "primary", size: "lg", href: "../register/register.html" })}
            ${btn({ label: "Browse Doctors", variant: "outline", size: "lg", href: "../doctors/doctors.html" })}
          </div>
        </div>
        <div class="hero-scroll">${icon("chevron-down", "ic-md")}</div>
      </section>

      <section class="section section-border-t">
        <div class="container">
          <div class="section-head">
            ${badge("Features", "muted")}
            <h2 class="section-title" style="margin-top:1rem;">Everything you need for <span class="cyan-text">smarter care</span></h2>
            <p class="section-desc">From token generation to live tracking, every feature is built to make waiting predictable.</p>
          </div>
          <div class="grid grid-3">
            ${FEATURES.map((f) => `
              <div class="tilt-card" data-tilt>
                <div class="feature-icon">${icon(f.icon, "ic-md")}</div>
                <h3 class="feature-title">${f.title}</h3>
                <p class="feature-desc">${f.desc}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      ${preview.length ? `
      <section class="section">
        <div class="container">
          <div class="section-head">${badge("Our Specialists", "muted")}<h2 class="section-title" style="margin-top:1rem;">Meet our doctors</h2></div>
          <div class="grid grid-4">${preview.map((d) => doctorCard(d, { compact: true, href: "../doctors/doctors.html" })).join("")}</div>
          <div class="text-center mt-6">${btn({ label: `View All Doctors ${icon("chevron-right", "ic-sm")}`, variant: "outline", size: "lg", href: "../doctors/doctors.html" })}</div>
        </div>
      </section>` : ""}

      <section class="section section-border-t">
        ${cyanGlow("")}
        <div class="container">
          <div class="grid" style="grid-template-columns: 1fr; gap: 4rem; align-items: center;" id="how-it-works-grid">
            <div>
              ${badge("Patient Flow", "muted")}
              <h2 class="section-title" style="text-align:left; margin-top:1rem;">From registration to<br /><span class="cyan-text">your appointment</span></h2>
              <div class="flex flex-col gap-4">
                ${STEPS.map((s) => `
                  <div class="step-row">
                    <div class="step-num">${s.step}</div>
                    <div><div class="step-title">${s.title}</div><div class="step-desc">${s.desc}</div></div>
                  </div>`).join("")}
              </div>
            </div>
            <div class="mock-token-wrap">
              <div class="mock-token">
                <div class="mock-token-glow" aria-hidden="true"></div>
                <div class="mock-token-card">
                  <div class="text-center mb-6">
                    <div class="xs faint" style="text-transform:uppercase; letter-spacing:0.08em;">Example Token</div>
                    <div class="mock-token-num">A024</div>
                    <div class="small muted mt-2">Sample illustration</div>
                  </div>
                  <div>
                    <div class="mock-token-row"><span class="faint">Position</span><span style="color:#fff;font-weight:600;">#5</span></div>
                    <div class="mock-token-row"><span class="faint">Est. Wait</span><span style="color:#fff;font-weight:600;">~48 min</span></div>
                    <div class="mock-token-row"><span class="faint">Room</span><span style="color:#fff;font-weight:600;">Room 201</span></div>
                  </div>
                  <div class="mock-token-confirm">✓ Your dashboard shows when you are called.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section-border-t" style="padding: 8rem 0; overflow: hidden;">
        <div class="text-center" style="position:relative; padding: 0 1rem;">
          <h2 class="cta-title">Ready to skip the wait?</h2>
          <p class="section-desc mb-6" style="max-width: 28rem;">Create an account and book your first token in under a minute.</p>
          <div class="hero-actions">
            ${btn({ label: `Create Free Account ${icon("chevron-right", "ic-md")}`, variant: "primary", size: "lg", href: "../register/register.html" })}
            ${btn({ label: "Learn More", variant: "ghost", size: "lg", href: "../hospital-info/hospital-info.html" })}
          </div>
        </div>
      </section>

      <footer class="footer">
        <div class="container footer-inner">
          <div class="flex items-center gap-2 muted small">${icon("activity", "ic-base", "cyan-text")}<span>MedQueue — Smart Hospital Queue Management (demo project)</span></div>
          <div class="flex items-center gap-4 small faint"><span>MIT licensed</span></div>
        </div>
      </footer>
    </div>`;
  refreshIcons();
  attachTiltEffects();
}

function setupParallax() {
  onParallaxScroll((y) => {
    const set = (id, transform) => {
      const el = document.getElementById(id);
      if (el) el.style.transform = transform;
    };
    set("px-glow", `translateY(${y * 0.3}px)`);
    set("px-blob-a", `translateY(${y * 0.5}px) translateZ(-50px)`);
    set("px-blob-b", `translateY(${y * 0.2}px) translateZ(-30px)`);
    set("px-grid", `translateY(${y * 0.15}px)`);
    set("px-heart", `translateY(${y * 0.4}px) rotate(${y * 0.02}deg)`);
    set("px-stetho", `translateY(${y * -0.2}px)`);
    set("px-hero-content", `translateY(${y * 0.1}px)`);
  });
}

render([]);
setupParallax();
fetchDoctors().then(render).catch(() => { /* the doctor preview is optional; the page works without it */ });
