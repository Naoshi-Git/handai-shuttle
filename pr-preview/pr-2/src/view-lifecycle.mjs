const $ = (selector, root = document) => root.querySelector(selector);

const TIMING = Object.freeze({
  revealMinimumMs: 210,
  timetableQuietMs: 120,
  timetableMaxMs: 680,
  scrollStableFrames: 4,
  scrollMaxMs: 420,
  pointerAbortMs: 720,
  cleanupMs: 220
});

let veil = null;
let transitionId = 0;
let pendingView = "";
let transitionStartedAt = 0;
let pointerAbortTimer = 0;

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function activeView() {
  return $(".view.is-active")?.dataset.view || "home";
}

function navView(target) {
  const nav = target instanceof Element ? target.closest(".bottom-nav [data-nav]") : null;
  return nav?.dataset.nav || "";
}

function installStyles() {
  if ($('link[data-view-lifecycle]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/view-lifecycle.css";
  link.dataset.viewLifecycle = "true";
  document.head.append(link);
}

function ensureVeil() {
  if (veil?.isConnected) return veil;
  veil = document.createElement("div");
  veil.className = "view-transition-veil";
  veil.setAttribute("aria-hidden", "true");
  veil.innerHTML = '<span class="view-transition-spinner" aria-hidden="true"></span>';
  document.body.append(veil);
  return veil;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function clearPointerAbort() {
  if (!pointerAbortTimer) return;
  window.clearTimeout(pointerAbortTimer);
  pointerAbortTimer = 0;
}

function finishTransition(id) {
  if (id !== transitionId || !veil) return;
  clearPointerAbort();
  veil.classList.remove("is-visible", "is-loading");
  pendingView = "";
  document.body.classList.remove("ui-view-transitioning");
  window.setTimeout(() => {
    if (id !== transitionId || veil?.classList.contains("is-visible")) return;
    veil?.setAttribute("aria-hidden", "true");
  }, TIMING.cleanupMs);
}

function beginTransition(view) {
  if (!view || view === activeView() || reducedMotion()) return 0;
  const layer = ensureVeil();
  transitionId += 1;
  const id = transitionId;
  pendingView = view;
  transitionStartedAt = performance.now();
  clearPointerAbort();
  document.body.classList.add("ui-view-transitioning");
  layer.classList.toggle("is-loading", view === "timetable");
  layer.dataset.targetView = view;
  layer.setAttribute("aria-hidden", "false");
  // Force the opacity-0 state to paint before entering the opaque neutral surface.
  layer.getBoundingClientRect();
  layer.classList.add("is-visible");
  return id;
}

function waitForTimetableDomQuiet() {
  const roots = [$("#timetable-route-controls"), $("#timetable-list")].filter(Boolean);
  if (!roots.length || typeof MutationObserver === "undefined") return delay(TIMING.timetableQuietMs);

  return new Promise((resolve) => {
    let done = false;
    let quietTimer = 0;
    let maxTimer = 0;
    const observer = new MutationObserver(() => armQuiet());
    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      window.clearTimeout(quietTimer);
      window.clearTimeout(maxTimer);
      resolve();
    };
    const armQuiet = () => {
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finish, TIMING.timetableQuietMs);
    };
    roots.forEach((root) => observer.observe(root, { childList: true, subtree: true }));
    armQuiet();
    maxTimer = window.setTimeout(finish, TIMING.timetableMaxMs);
  });
}

function waitForScrollIdle() {
  return new Promise((resolve) => {
    const started = performance.now();
    let lastY = window.scrollY;
    let stableFrames = 0;
    const tick = () => {
      const currentY = window.scrollY;
      if (Math.abs(currentY - lastY) < 0.5) stableFrames += 1;
      else stableFrames = 0;
      lastY = currentY;
      if (stableFrames >= TIMING.scrollStableFrames || performance.now() - started >= TIMING.scrollMaxMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function settleTransition(view, id) {
  await nextFrame();
  await nextFrame();

  if (view === "timetable") {
    await waitForTimetableDomQuiet();
    await waitForScrollIdle();
  }

  const elapsed = performance.now() - transitionStartedAt;
  if (elapsed < TIMING.revealMinimumMs) await delay(TIMING.revealMinimumMs - elapsed);
  await nextFrame();
  finishTransition(id);
}

function onPointerDown(event) {
  const view = navView(event.target);
  if (!view || view === activeView()) return;
  const id = beginTransition(view);
  if (!id) return;
  pointerAbortTimer = window.setTimeout(() => {
    if (id === transitionId && pendingView === view) finishTransition(id);
  }, TIMING.pointerAbortMs);
}

function onClickCapture(event) {
  const view = navView(event.target);
  if (!view || view === activeView()) return;
  if (pendingView !== view) beginTransition(view);
}

function onClickAfter(event) {
  const view = navView(event.target);
  if (!view || pendingView !== view) return;
  clearPointerAbort();
  const id = transitionId;
  queueMicrotask(() => void settleTransition(view, id));
}

function init() {
  installStyles();
  ensureVeil();
  window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  window.addEventListener("click", onClickCapture, true);
  document.addEventListener("click", onClickAfter);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
