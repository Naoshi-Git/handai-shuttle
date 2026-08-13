const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const TIMING = Object.freeze({
  // Yahoo!乗換案内の実機フレームをbenchmarkに、50/50の長いdouble exposureではなく
  // outgoingを先に落としてincomingを少し遅らせる短いdissolveにする。
  crossfadeMs: 220,
  timetableMinimumMs: 220,
  timetableQuietMs: 110,
  timetableMaxMs: 640,
  scrollStableFrames: 4,
  scrollMaxMs: 420
});

let loader = null;
let transitionId = 0;
let headerTitleGhost = null;
let serviceBannerGhost = null;
let serviceBannerPlaceholder = null;

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

function searchEntryView(target) {
  if (!(target instanceof Element)) return "";
  const trigger = target.closest(
    "#search-now-button, #arrival-search-button, #open-search-button, [data-route-origin]"
  );
  return trigger ? "search" : "";
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

function stripIds(root) {
  root.removeAttribute?.("id");
  root.querySelectorAll?.("[id]").forEach((node) => node.removeAttribute("id"));
}

function fixedGhost(source, className) {
  if (!source) return null;
  const rect = source.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const ghost = source.cloneNode(true);
  stripIds(ghost);
  ghost.classList.add(className);
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.setProperty("--view-ghost-top", `${rect.top}px`);
  ghost.style.setProperty("--view-ghost-left", `${rect.left}px`);
  ghost.style.setProperty("--view-ghost-width", `${rect.width}px`);
  ghost.style.setProperty("--view-ghost-height", `${rect.height}px`);
  document.body.append(ghost);
  return ghost;
}

function clearViewTransitionClasses() {
  $$(".view").forEach((view) => {
    view.classList.remove("view-crossfade-leaving", "view-crossfade-entering", "view-crossfade-running");
    view.removeAttribute("aria-hidden");
    view.style.removeProperty("--view-crossfade-top");
    view.style.removeProperty("--view-crossfade-left");
    view.style.removeProperty("--view-crossfade-width");
  });
}

function currentHeaderTitle() {
  return $(".topbar .brand-copy h1:not(.view-header-title-ghost)");
}

function clearHeaderTransition() {
  headerTitleGhost?.remove();
  headerTitleGhost = null;
  currentHeaderTitle()?.classList.remove("view-header-title-entering", "view-crossfade-running");
}

function clearServiceBannerTransition() {
  serviceBannerGhost?.remove();
  serviceBannerGhost = null;
  serviceBannerPlaceholder?.remove();
  serviceBannerPlaceholder = null;
  const banner = $("#service-banner");
  banner?.classList.remove("view-service-banner-entering", "view-crossfade-running");
}

function prepareHeaderTransition() {
  clearHeaderTransition();
  const title = currentHeaderTitle();
  if (!title) return;

  // Keep both titles inside the same Topbar layout context. A body-level fixed clone loses
  // the current Topbar typography/layout selectors and can visibly resize from the top-left.
  headerTitleGhost = title.cloneNode(true);
  stripIds(headerTitleGhost);
  headerTitleGhost.classList.add("view-header-title-ghost");
  headerTitleGhost.setAttribute("aria-hidden", "true");
  title.after(headerTitleGhost);
  title.classList.add("view-header-title-entering");
}

function runHeaderTransition() {
  headerTitleGhost?.classList.add("view-crossfade-running");
  currentHeaderTitle()?.classList.add("view-crossfade-running");
}

function prepareServiceBannerTransition(fromView, toView) {
  clearServiceBannerTransition();
  const crossesSearchBoundary = (fromView === "search") !== (toView === "search");
  if (!crossesSearchBoundary) return;

  const banner = $("#service-banner");
  if (!banner) return;
  serviceBannerGhost = fixedGhost(banner, "view-service-banner-ghost");

  if (fromView === "search") {
    const rect = banner.getBoundingClientRect();
    const styles = getComputedStyle(banner);
    serviceBannerPlaceholder = document.createElement("div");
    serviceBannerPlaceholder.className = "service-banner-transition-placeholder";
    serviceBannerPlaceholder.setAttribute("aria-hidden", "true");
    serviceBannerPlaceholder.style.height = `${rect.height}px`;
    serviceBannerPlaceholder.style.marginTop = styles.marginTop;
    serviceBannerPlaceholder.style.marginRight = styles.marginRight;
    serviceBannerPlaceholder.style.marginBottom = styles.marginBottom;
    serviceBannerPlaceholder.style.marginLeft = styles.marginLeft;
    banner.before(serviceBannerPlaceholder);
    banner.classList.add("view-service-banner-entering");
  }
}

function runServiceBannerTransition() {
  serviceBannerGhost?.classList.add("view-crossfade-running");
  $("#service-banner.view-service-banner-entering")?.classList.add("view-crossfade-running");
}

function freezeOutgoingView(view) {
  if (!view) return;
  const rect = view.getBoundingClientRect();
  view.style.setProperty("--view-crossfade-top", `${rect.top}px`);
  view.style.setProperty("--view-crossfade-left", `${rect.left}px`);
  view.style.setProperty("--view-crossfade-width", `${rect.width}px`);
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
  clearHeaderTransition();
  clearServiceBannerTransition();
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

  const fromView = outgoing.dataset.view || "home";
  hideLoader();
  clearViewTransitionClasses();
  document.body.classList.add("ui-view-crossfading");

  // Freeze the exact outgoing viewport geometry before commitView changes header/body state,
  // moves the shared service banner, or resets scroll position.
  freezeOutgoingView(outgoing);
  outgoing.classList.add("view-crossfade-leaving");
  incoming.classList.add("view-crossfade-entering");
  outgoing.setAttribute("aria-hidden", "true");
  prepareHeaderTransition();
  prepareServiceBannerTransition(fromView, view);

  commitView(view);
  await nextFrame();
  if (id !== transitionId) return;

  outgoing.classList.add("view-crossfade-running");
  incoming.classList.add("view-crossfade-running");
  runHeaderTransition();
  runServiceBannerTransition();
  await delay(reducedMotion() ? 0 : TIMING.crossfadeMs);
  if (id !== transitionId) return;

  clearViewTransitionClasses();
  clearHeaderTransition();
  clearServiceBannerTransition();
  document.body.classList.remove("ui-view-crossfading");
}

async function revealTimetable(id) {
  clearViewTransitionClasses();
  clearServiceBannerTransition();
  prepareHeaderTransition();
  const layer = ensureLoader();
  const started = performance.now();
  document.body.classList.add("ui-timetable-loading");
  layer.setAttribute("aria-hidden", "false");
  layer.classList.add("is-visible");

  commitView("timetable");
  await nextFrame();
  runHeaderTransition();
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
  clearHeaderTransition();
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
  if (view) {
    // Bottom navigation is owned here. Keep legacy/base tab-entry listeners from repainting
    // an already-preloaded view.
    event.preventDefault();
    event.stopPropagation();
    if (view === activeView()) return;
    switchTab(view);
    return;
  }

  const searchView = searchEntryView(event.target);
  if (!searchView || searchView === activeView()) return;

  // Home/route shortcuts still have legacy bubble handlers that prepare Search form state.
  // Pre-commit the view here so those handlers cannot bypass the lifecycle animation/nav
  // state. Do not stop propagation: the legacy handler still owns the search parameters.
  switchTab(searchView);
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
