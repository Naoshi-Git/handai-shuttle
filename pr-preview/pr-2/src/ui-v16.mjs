const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const INSTALL_GUIDE_SOURCES = Object.freeze([
  "./assets/help/install/ios-01-share.webp",
  "./assets/help/install/ios-02-add-home.webp",
  "./assets/help/install/ios-03-confirm.webp"
]);
const NAV_ORDER = Object.freeze(["home", "search", "timetable", "settings"]);
const CONTROL_MOTION_SELECTOR = [
  ".bottom-nav [data-nav]",
  "#search-now-button",
  "#arrival-search-button",
  "#open-search-button",
  "#home-destination-chips [data-home-destination]",
  ".tt-campus-tabs [data-tt-origin]",
  ".tt-destination-buttons [data-tt-destination]",
  ".search-mode [data-mode]",
  ".search-submit",
  "[data-result-step]",
  ".route-shortcut"
].join(",");
const NATIVE_TRANSITION_SELECTOR = ".bottom-nav [data-nav]";

let normalizeQueued = false;
let transitionGuard = false;
let transitionRunning = false;
let nativeDialogClose = null;
let nativeScrollIntoView = null;

function installStyles() {
  if ($('link[data-ui-v16]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-v16.css";
  link.dataset.uiV16 = "true";
  document.head.append(link);
}

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function useNativeViewTransitions() {
  if (typeof document.startViewTransition !== "function" || reducedMotion()) return false;
  // iPhone/iPad are the primary surface for this app. Full-document snapshots combined
  // with sticky/backdrop-filter UI can block WebKit's main thread long enough to make a
  // tap look lost. Keep native View Transitions as a desktop enhancement and let touch
  // devices use the lightweight CSS/control motion below.
  return window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches === true;
}

function transitionMeta(target) {
  const navButton = target.closest?.(".bottom-nav [data-nav]");
  if (navButton) {
    const current = $(".bottom-nav [data-nav].is-active")?.dataset.nav;
    const next = navButton.dataset.nav;
    const from = NAV_ORDER.indexOf(current);
    const to = NAV_ORDER.indexOf(next);
    return { kind: "tab", direction: from >= 0 && to >= 0 && to < from ? "back" : "forward" };
  }
  return { kind: "control", direction: "none" };
}

function runExistingClick(target, event) {
  transitionGuard = true;
  try {
    if (target instanceof HTMLButtonElement || target instanceof HTMLInputElement) target.click();
    else target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window, button: event.button || 0 }));
  } finally {
    transitionGuard = false;
  }
}

function bindViewTransitions() {
  const supported = useNativeViewTransitions();
  document.body.classList.toggle("has-view-transitions-v16", supported);
  if (!supported || document.documentElement.dataset.v16TransitionBound === "true") return;
  document.documentElement.dataset.v16TransitionBound = "true";

  document.addEventListener("click", (event) => {
    if (transitionGuard || transitionRunning || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const target = event.target instanceof Element ? event.target.closest(NATIVE_TRANSITION_SELECTOR) : null;
    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return;
    if (target.closest("dialog[open]") || document.activeViewTransition) return;

    const meta = transitionMeta(target);
    event.preventDefault();
    event.stopImmediatePropagation();
    document.documentElement.dataset.v16TransitionKind = meta.kind;
    document.documentElement.dataset.v16TransitionDirection = meta.direction;

    transitionRunning = true;
    try {
      // The update callback must stay synchronous. Waiting for rAF/timers here keeps the
      // old snapshot alive and turns normal rendering work into interaction latency.
      const transition = document.startViewTransition(() => runExistingClick(target, event));
      transition.finished.finally(() => {
        transitionRunning = false;
        delete document.documentElement.dataset.v16TransitionKind;
        delete document.documentElement.dataset.v16TransitionDirection;
        normalizeUi();
      });
    } catch {
      transitionRunning = false;
      delete document.documentElement.dataset.v16TransitionKind;
      delete document.documentElement.dataset.v16TransitionDirection;
      runExistingClick(target, event);
    }
  }, true);
}

function ensureChoiceGlider(track) {
  if (!track) return;
  track.classList.add("v16-choice-track");
  let glider = $(".v16-choice-glider", track);
  if (!glider) {
    glider = document.createElement("span");
    glider.className = "v16-choice-glider";
    glider.setAttribute("aria-hidden", "true");
    track.prepend(glider);
  }
  const active = $("button.is-active", track);
  if (!active) {
    track.classList.remove("v16-choice-ready");
    return;
  }

  // Read geometry once, then write CSS variables. This runs only after relevant
  // interactions/child-list updates rather than after every class mutation in the app.
  const trackRect = track.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  if (!trackRect.width || !activeRect.width) return;
  track.style.setProperty("--v16-choice-x", `${activeRect.left - trackRect.left}px`);
  track.style.setProperty("--v16-choice-y", `${activeRect.top - trackRect.top}px`);
  track.style.setProperty("--v16-choice-width", `${activeRect.width}px`);
  track.style.setProperty("--v16-choice-height", `${activeRect.height}px`);
  requestAnimationFrame(() => track.classList.add("v16-choice-ready"));
}

function normalizeChoiceTracks() {
  $$(".tt-campus-tabs, .segmented").forEach(ensureChoiceGlider);
}

function normalizeResultStepper() {
  const previous = $('[data-result-step="-1"]');
  const next = $('[data-result-step="1"]');
  if (previous && previous.dataset.v16Copy !== "true") {
    previous.textContent = "‹  前の便";
    previous.dataset.v16Copy = "true";
  }
  if (next && next.dataset.v16Copy !== "true") {
    next.textContent = "次の便  ›";
    next.dataset.v16Copy = "true";
  }
  const status = $("#result-step-status");
  if (status && status.textContent.trim() === "前後の便") status.textContent = "便を移動";
}

function keepInstallGuideSourcesStable() {
  $$(".install-guide-media img").forEach((img, index) => {
    const src = INSTALL_GUIDE_SOURCES[index];
    if (!src) return;
    if (!img.getAttribute("src")?.includes(src.replace("./", ""))) img.src = src;
  });
}

function installDialogCloseMotion() {
  if (nativeDialogClose || typeof HTMLDialogElement === "undefined") return;
  nativeDialogClose = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.close = function v16Close(returnValue) {
    if (!this.open || reducedMotion()) return nativeDialogClose.call(this, returnValue);
    if (this.classList.contains("v16-closing")) return;
    this.classList.add("v16-closing");
    window.setTimeout(() => {
      nativeDialogClose.call(this, returnValue);
      this.classList.remove("v16-closing");
    }, 138);
  };

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button, input[type='submit']") : null;
    const dialog = target?.closest("dialog[open]");
    const form = target?.closest("form[method='dialog']");
    if (!dialog || !form || reducedMotion()) return;
    event.preventDefault();
    const value = target.value || "";
    dialog.close(value);
  }, true);
}

function visibleTimetableViewport() {
  const controls = $("#timetable-route-controls");
  const topbar = $(".topbar");
  const nav = $(".bottom-nav");
  const top = Math.max(0, controls?.getBoundingClientRect().bottom || topbar?.getBoundingClientRect().bottom || 0);
  const bottom = Math.min(window.innerHeight, nav?.getBoundingClientRect().top || window.innerHeight);
  return { top, bottom: Math.max(top + 120, bottom) };
}

function smoothTimetableJump(element) {
  const rect = element.getBoundingClientRect();
  const viewport = visibleTimetableViewport();
  const available = Math.max(120, viewport.bottom - viewport.top);
  const targetViewportTop = viewport.top + Math.max(0, (available - rect.height) / 2);
  const top = Math.max(0, window.scrollY + rect.top - targetViewportTop);
  const duringTransition = Boolean(document.documentElement.dataset.v16TransitionKind);
  window.scrollTo({ top, behavior: duringTransition ? "auto" : "smooth" });
  element.classList.remove("v16-jump-target");
  window.setTimeout(() => {
    element.classList.add("v16-jump-target");
    window.setTimeout(() => element.classList.remove("v16-jump-target"), 700);
  }, duringTransition ? 30 : 260);
}

function installTimetableScrollSmoother() {
  if (nativeScrollIntoView || typeof Element === "undefined") return;
  nativeScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function v16ScrollIntoView(options) {
    if (
      document.body?.classList.contains("ui-v16") &&
      this instanceof HTMLElement &&
      this.matches("#timetable-list .route-timetable-card") &&
      (typeof options !== "object" || options?.behavior === "smooth")
    ) {
      smoothTimetableJump(this);
      return;
    }
    return nativeScrollIntoView.call(this, options);
  };
}

function normalizeUi() {
  if (normalizeQueued) return;
  normalizeQueued = true;
  requestAnimationFrame(() => {
    normalizeQueued = false;
    normalizeChoiceTracks();
    normalizeResultStepper();
    keepInstallGuideSourcesStable();
    document.documentElement.dataset.uiReady = "v16";
  });
}

function bindInteractionNormalization() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest(CONTROL_MOTION_SELECTOR) : null;
    if (!target) return;
    // Let the app's existing click handlers update active state first.
    requestAnimationFrame(normalizeUi);
  }, true);
}

function observeDynamicUi() {
  // Previous revisions already observe active-class changes. v16 must not add another
  // app-wide attributes observer: that multiplies work on every tap and can force layout
  // repeatedly. Child-list observation is enough for newly rendered results/settings.
  const roots = [$("#search-results"), $("#timetable-list"), $("#view-settings")].filter(Boolean);
  if (!roots.length) return;
  const observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList")) normalizeUi();
  });
  roots.forEach((root) => observer.observe(root, { childList: true, subtree: true }));
}

function init() {
  document.body.classList.add("ui-v16");
  installStyles();
  bindViewTransitions();
  bindInteractionNormalization();
  installDialogCloseMotion();
  installTimetableScrollSmoother();
  normalizeUi();
  observeDynamicUi();
  window.addEventListener("resize", normalizeUi, { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(normalizeUi, 90), { passive: true });
  window.setTimeout(normalizeUi, 160);
  window.setTimeout(normalizeUi, 520);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
