import { icon, refreshIcons } from "../shared/icons.js";
import { badge, btn, cyanGlow } from "../shared/ui.js";
import { doctorCard } from "../shared/doctorCard.js";
import { getDoctors } from "../shared/store.js";
import { onParallaxScroll, attachTiltEffects } from "../shared/tilt.js";
import { mountNav } from "../shared/nav.js";

mountNav("homepage");

const FEATURES = [
  { icon: "zap", title: "Instant Token Generation", desc: "Get your digital queue token in seconds. No paperwork, no waiting in line." },
  { icon: "activity", title: "Real-time Queue Tracking", desc: "Watch your position update live. Know exactly when it's your turn." },
  { icon: "shield", title: "Emergency Priority", desc: "Critical cases are moved to the front immediately with full transparency." },
  { icon: "bar-chart-3", title: "Smart Analytics", desc: "Hospitals gain insights into peak hours, wait times, and patient flow." },
  { icon: "bell", title: "Turn Notifications", desc: "Get alerted when you're next so you can relax without watching the screen." },
  { icon: "users", title: "Multi-Role Access", desc: "Tailored dashboards for Patients, Doctors, and Administrators." },
];

const STEPS = [
  { step: "01", title: "Register & Select Doctor", desc: "Create your account and browse available specialists by department." },
  { step: "02", title: "Generate Your Token", desc: "Receive a digital queue token with your position number in seconds." },
  { step: "03", title: "Track in Real Time", desc: "Watch your position update live and get notified when you're next." },
  { step: "04", title: "See the Doctor", desc: "Head to the room when called. Your token is marked complete automatically." },
];

function render() {
  const doctors = getDoctors();

  document.getElementById("page-root").innerHTML = `
    <div style="overflow: hidden;">
      <!-- Hero -->
      <section class="hero" style="perspective: 1200px;">
        <div id="px-glow" class="hero-bg-glow" aria-hidden="true"></div>
        <div id="px-blob-a" class="hero-blob-a" aria-hidden="true"></div>
        <div id="px-blob-b" class="hero-blob-b" aria-hidden="true"></div>
        <div id="px-grid" class="hero-grid" aria-hidden="true"></div>
        <div id="px-heart" class="hero-float hero-float-a" aria-hidden="true">${icon("heart", "ic-hero")}</div>
        <div id="px-stetho" class="hero-float hero-float-b" aria-hidden="true">${icon("stethoscope", "ic-hero")}</div>

        <div id="px-hero-content" class="hero-content">
          <div class="hero-pill">${icon("zap", "ic-sm")} Smart Hospital Queue System — Now Live</div>
          <h1 class="hero-title">No More <span class="accent">Waiting</span><br />in the Dark</h1>
          <p class="hero-sub">Real-time digital queue management for modern hospitals. Know your position, track your wait, and get notified — all from your phone.</p>
          <div class="hero-actions">
            ${btn({ label: `Get Started Free ${icon("chevron-right", "ic-md")}`, variant: "primary", size: "lg", href: "../register/register.html" })}
            ${btn({ label: "Browse Doctors", variant: "outline", size: "lg", href: "../doctors/doctors.html" })}
          </div>
        </div>

        <div class="hero-scroll">${icon("chevron-down", "ic-md")}</div>
      </section>

      <!-- Stats -->
      <section class="section section-border-y">
        ${cyanGlow("")}
        <div class="container">
          <div class="grid grid-4" id="stat-values">
            <div class="text-center"><div class="stat-value">0+</div><div class="stat-label">Patients Served</div></div>
            <div class="text-center"><div class="stat-value">0+</div><div class="stat-label">Specialist Doctors</div></div>
            <div class="text-center"><div class="stat-value">0%</div><div class="stat-label">System Uptime</div></div>
            <div class="text-center"><div class="stat-value">0%</div><div class="stat-label">Wait Time Reduced</div></div>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="section">
        <div class="container">
          <div class="section-head">
            ${badge("Features", "muted")}
            <h2 class="section-title" style="margin-top:1rem;">Everything you need for <span class="cyan-text">smarter care</span></h2>
            <p class="section-desc">From token generation to real-time tracking, every feature is built to reduce wait times and improve the patient experience.</p>
          </div>
          <div class="grid grid-3">
            ${FEATURES.map(
              (f) => `
              <div class="tilt-card" data-tilt>
                <div class="feature-icon">${icon(f.icon, "ic-md")}</div>
                <h3 class="feature-title">${f.title}</h3>
                <p class="feature-desc">${f.desc}</p>
              </div>`
            ).join("")}
          </div>
        </div>
      </section>

      <!-- Doctor highlights -->
      <section class="section">
        <div class="container">
          <div class="section-head">
            ${badge("Our Specialists", "muted")}
            <h2 class="section-title" style="margin-top:1rem;">Meet our top doctors</h2>
          </div>
          <div class="grid grid-4">
            ${doctors.slice(0, 4).map((d) => doctorCard(d, { compact: true, href: "../register/register.html" })).join("")}
          </div>
          <div class="text-center mt-6">
            ${btn({ label: `View All Doctors ${icon("chevron-right", "ic-sm")}`, variant: "outline", size: "lg", href: "../doctors/doctors.html" })}
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section class="section section-border-t">
        ${cyanGlow("")}
        <div class="container">
          <div class="grid" style="grid-template-columns: 1fr; gap: 4rem; align-items: center;" id="how-it-works-grid">
            <div>
              ${badge("Patient Flow", "muted")}
              <h2 class="section-title" style="text-align:left; margin-top:1rem;">From registration to<br /><span class="cyan-text">your appointment</span></h2>
              <div class="flex flex-col gap-4">
                ${STEPS.map(
                  (s) => `
                  <div class="step-row">
                    <div class="step-num">${s.step}</div>
                    <div><div class="step-title">${s.title}</div><div class="step-desc">${s.desc}</div></div>
                  </div>`
                ).join("")}
              </div>
            </div>

            <div class="mock-token-wrap">
              <div class="mock-token">
                <div class="mock-token-glow" aria-hidden="true"></div>
                <div class="mock-token-card">
                  <div class="text-center mb-6">
                    <div class="xs faint" style="text-transform:uppercase; letter-spacing:0.08em;">Queue Token</div>
                    <div class="mock-token-num">A24</div>
                    <div class="small muted mt-2">Dr. Sarah Chen · Cardiology</div>
                  </div>
                  <div>
                    <div class="mock-token-row"><span class="faint">Position</span><span style="color:#fff;font-weight:600;">5th in line</span></div>
                    <div class="mock-token-row"><span class="faint">Est. Wait</span><span style="color:#fff;font-weight:600;">~48 min</span></div>
                    <div class="mock-token-row"><span class="faint">Room</span><span style="color:#fff;font-weight:600;">Room 201</span></div>
                  </div>
                  <div class="mock-token-confirm">✓ Token confirmed. We'll notify you when you're next.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="section section-border-t" style="padding: 8rem 0; overflow: hidden;">
        <div class="text-center" style="position:relative; padding: 0 1rem;">
          <h2 class="cta-title">Ready to skip the wait?</h2>
          <p class="section-desc mb-6" style="max-width: 28rem;">Join thousands of patients already using MedQueue to manage their hospital visits smarter.</p>
          <div class="hero-actions">
            ${btn({ label: `Create Free Account ${icon("chevron-right", "ic-md")}`, variant: "primary", size: "lg", href: "../register/register.html" })}
            ${btn({ label: "Learn More", variant: "ghost", size: "lg", href: "../hospital-info/hospital-info.html" })}
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="container footer-inner">
          <div class="flex items-center gap-2 muted small">
            ${icon("activity", "ic-base", "cyan-text")}
            <span>MedQueue © 2025 — Smart Hospital Queue Management</span>
          </div>
          <div class="flex items-center gap-4 small faint">
            <span>WCAG 2.1 AA Compliant</span>
            <span>HIPAA Ready</span>
            <span>99.5% Uptime SLA</span>
          </div>
        </div>
      </footer>
    </div>
  `;
}

function startCounterAnimation() {
  const targets = { patients: 48200, doctors: 127, uptime: 99.5, reduced: 68 };
  const steps = 60;
  const interval = 2000 / steps;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const progress = step / steps;
    const el = document.getElementById("stat-values");
    if (el) {
      const nums = el.querySelectorAll(".stat-value");
      if (nums[0]) nums[0].textContent = `${Math.round(targets.patients * progress).toLocaleString()}+`;
      if (nums[1]) nums[1].textContent = `${Math.round(targets.doctors * progress)}+`;
      if (nums[2]) nums[2].textContent = `${parseFloat((targets.uptime * progress).toFixed(1))}%`;
      if (nums[3]) nums[3].textContent = `${Math.round(targets.reduced * progress)}%`;
    }
    if (step >= steps) clearInterval(timer);
  }, interval);
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

render();
startCounterAnimation();
setupParallax();
attachTiltEffects();
refreshIcons();
