// Short polling that behaves: one request at a time, paused while the tab is hidden,
// exponential back-off after failures, and cancelled when the page goes away.
export function startPolling(task, { interval = 4000, maxInterval = 30000 } = {}) {
  let timer = null;
  let stopped = false;
  let running = false;
  let failures = 0;
  let controller = null;

  const schedule = (ms) => {
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(tick, ms);
  };

  async function tick() {
    if (stopped || running) return;
    if (document.hidden) return schedule(interval);
    running = true;
    controller = new AbortController();
    try {
      await task(controller.signal);
      failures = 0;
    } catch (e) {
      if (e.name !== "AbortError") failures += 1;
    } finally {
      running = false;
    }
    schedule(Math.min(maxInterval, interval * 2 ** failures));
  }

  const onVisible = () => {
    if (!document.hidden && !stopped) {
      clearTimeout(timer);
      tick();
    }
  };

  function stop() {
    stopped = true;
    clearTimeout(timer);
    controller?.abort();
    document.removeEventListener("visibilitychange", onVisible);
  }

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pagehide", stop, { once: true });
  schedule(interval);

  return {
    stop,
    refresh() {
      clearTimeout(timer);
      tick();
    },
  };
}
