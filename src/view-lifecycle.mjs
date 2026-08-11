const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const TIMING = Object.freeze({
  crossfadeMs: 190,
  timetableMinimumMs: 220,
  timetableQuietMs: 110,
  timetableMaxMs: 640,
  scrollStableFrames: 4,
  scrollMaxMs: 420
});

let loader = null;
let transitionId = 0;

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

function ensureLoader() {
  if (loader?.isConnected) return loader;
  loader = document.createElement("div");
  loader.className = "timetable-transition-loader";
  loader.setAttribute("aria-hidden", "true");
  loader.innerHTML = '<span class="timetable-transition-spinner" aria-hidden="true"></span>';
  document.body.append(loader);
  return loader;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function clearViewTransitionClasses() {
  $$(".view").forEach((view) => {
    view.classList.remove("view-crossfade-leaving", "view-crossfade-entering", "view-crossfade-running");
    view.removeAttribute("aria-hidden");
  });
}

function hideLoader() {
  const layer = ensureLoader();
  layer.classList.remove("is-visible");
  layer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("ui-timetable-loading");
}

function setNavState(view) {
  $$(".bottom-nav [data-nav]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.nav === view);
  });
}

function commitView(view) {
  $$(".view").forEach((section) => section.classList.toggle("is-active", section.dataset.view === view));
  setNavState(view);
  window.scrollTo({ top: 0, behavior: "auto" });
  window.dispatchEvent(new CustomEvent("handai:viewchange", { detail: { view, source: "view-lifecycle" } }));
  // ui-current owns the persistent nav glider and already recalculates it on resize.
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
}

function resetTransitionArtifacts() {
  clearViewTransitionClasses();
  hideLoader();
  document.body.classList.remove("ui-view-crossfading");
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

async function crossfadeTo(view, id) {
  const outgoing = $(".view.is-active");
  const incoming = $(`.view[data-view="${view}"]`);
  if (!incoming || !outgoing || incoming === outgoing) return;

  hideLoader();
  clearViewTransitionClasses();
  document.body.classList.add("ui-view-crossfading");
  outgoing.classList.add("view-crossfade-leaving");
  incoming.classList.add("view-crossfade-entering");
  outgoing.setAttribute("aria-hidden", "true");

  commitView(view);
  await nextFrame();
  if (id !== transitionId) return;

  outgoing.classList.add("view-crossfade-running");
  incoming.classList.add("view-crossfade-running");
  await delay(reducedMotion() ? 0 : TIMING.crossfadeMs);
  if (id !== transitionId) return;

  clearViewTransitionClasses();
  document.body.classList.remove("ui-view-crossfading");
}

async function revealTimetable(id) {
  clearViewTransitionClasses();
  const layer = ensureLoader();
  const started = performance.now();
  document.body.classList.add("ui-timetable-loading");
  layer.setAttribute("aria-hidden", "false");
  layer.classList.add("is-visible");

  commitView("timetable");
  await nextFrame();
  await nextFrame();
  if (id !== transitionId) return;

  await Promise.all([waitForTimetableDomQuiet(), waitForScrollIdle()]);
  const elapsed = performance.now() - started;
  if (!reducedMotion() && elapsed < TIMING.timetableMinimumMs) {
    await delay(TIMING.timetableMinimumMs - elapsed);
  }
  if (id !== transitionId) return;

  await nextFrame();
  hideLoader();
}

function switchTab(view) {
  if (!view || view === activeView()) return;
  transitionId += 1;
  const id = transitionId;
  resetTransitionArtifacts();
  if (view === "timetable") void revealTimetable(id);
  else void crossfadeTo(view, id);
}

function onNavClickCapture(event) {
  const view = navView(event.target);
  if (!view) return;

  // Bottom navigation is owned here. Keep legacy/base tab-entry listeners from repainting an already-preloaded view.
  event.preventDefault();
  event.stopPropagation();
  if (view === activeView()) return;
  switchTab(view);
}

function init() {
  document.body.classList.add("ui-view-lifecycle");
  installStyles();
  ensureLoader();
  window.addEventListener("click", onNavClickCapture, true);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
