// Small hover-tilt effect for cards, ported from the original app's
// useTilt() hook. Call attachTiltEffects() once after injecting new
// HTML — it finds every element marked data-tilt and wires up plain
// mousemove/mouseleave listeners (no state, no re-render needed).

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function attachTiltEffects(root = document) {
  if (prefersReducedMotion()) return;
  root.querySelectorAll("[data-tilt]").forEach((el) => {
    if (el.dataset.tiltReady) return; // avoid double-binding
    el.dataset.tiltReady = "1";
    el.style.transition = "transform 0.15s ease-out";
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -16;
      el.style.transform = `perspective(800px) rotateX(${y}deg) rotateY(${x}deg)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    });
  });
}

// Scroll-based parallax offset, ported from useParallax(). Instead of
// a hook, this just calls back with window.scrollY on every scroll.
export function onParallaxScroll(callback) {
  if (prefersReducedMotion()) {
    callback(0);
    return () => {};
  }
  const handler = () => callback(window.scrollY);
  window.addEventListener("scroll", handler, { passive: true });
  return () => window.removeEventListener("scroll", handler);
}
