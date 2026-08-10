const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const NAV_ORDER = Object.freeze(["home", "search", "timetable", "settings"]);
const CHOICE_SELECTOR = [
  "#home-destination-chips",
  ".search-mode",
  ".tt-campus-tabs",
  ".tt-destination-buttons"
].join(",");

const geometryByKey = new Map();
let structuralObserver = null;
let favoriteObserver = null;
let normalizeQueued = false;
let activeChoiceKey = null;
let navReplayGuard = false;
let navTransitionRunning = false;

function installStyles() {
  if ($('link[data-ui-motion-v2]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-motion-v2.css";
  link.dataset.uiMotionV2 = "true";
  document.head.append(link);
}

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function choiceKey(track) {
  if (track.matches("#home-destination-chips")) return "home-destination";
  if (track.matches(".search-mode")) return "search-mode";
  if (track.matches(".tt-campus-tabs")) return "timetable-origin";
  if (track.matches(".tt-destination-buttons")) return "timetable-destination";
  return "choice";
}

function interactionChoiceKey(target) {
  if (target.closest?.("#home-destination-chips [data-home-destination]")) return "home-destination";
  if (target.closest?.(".search-mode [data-mode]")) return "search-mode";
  if (target.closest?.(".tt-campus-tabs [data-tt-origin]")) return "timetable-origin";
  if (target.closest?.(".tt-destination-buttons [data-tt-destination]")) return "timetable-destination";
  return null;
}

function measureChoice(track) {
  const active = $("button.is-active", track);
  if (!active) return null;
  return { x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight };
}

function writeGeometry(track, geometry) {
  if (!geometry) return;
  track.style.setProperty("--runtime-choice-x", `${geometry.x}px`);
  track.style.setProperty("--runtime-choice-y", `${geometry.y}px`);
  track.style.setProperty("--runtime-choice-width", `${geometry.width}px`);
  track.style.setProperty("--runtime-choice-height", `${geometry.height}px`);
}

function ensureGlider(track) {
  track.classList.add("runtime-choice-track");
  let glider = $(".runtime-choice-glider", track);
  if (!glider) {
    glider = document.createElement("span");
    glider.className = "runtime-choice-glider";
    glider.setAttribute("aria-hidden", "true");
    track.prepend(glider);
  }
  return glider;
}

function normalizeChoiceTrack(track, { animate = false } = {}) {
  if (!track) return;
  const key = choiceKey(track);
  const next = measureChoice(track);
  if (!next) return;
  const previous = geometryByKey.get(key);
  const glider = ensureGlider(track);

  if (!animate || !previous) {
    track.classList.add("runtime-choice-instant");
    writeGeometry(track, next);
    track.classList.add("runtime-choice-ready");
    void glider.offsetWidth;
    requestAnimationFrame(() => track.classList.remove("runtime-choice-instant"));
  } else {
    track.classList.add("runtime-choice-instant");
    writeGeometry(track, previous);
    track.classList.add("runtime-choice-ready");
    void glider.offsetWidth;
    track.classList.remove("runtime-choice-instant");
    writeGeometry(track, next);
  }

  geometryByKey.set(key, next);
}

function snapshotChoiceGeometry() {
  $$(CHOICE_SELECTOR).forEach((track) => {
    const geometry = measureChoice(track);
    if (geometry) geometryByKey.set(choiceKey(track), geometry);
  });
}

function normalizeChoices(changedKey = null) {
  $$(CHOICE_SELECTOR).forEach((track) => {
    normalizeChoiceTrack(track, { animate: Boolean(changedKey && choiceKey(track) === changedKey) });
  });
}

function normalizeFavoriteSection() {
  const section = $("#favorite-trips-v6");
  if (!section) return;
  const subtitle = $(".compact-settings-head p", section);
  if (subtitle && subtitle.textContent !== "タップすると保存した便を開きます") subtitle.textContent = "タップすると保存した便を開きます";
  $$(".favorite-saved-row em", section).forEach((node) => {
    const value = node.textContent.trim().replace(/便+$/u, "");
    if (value) node.textContent = `${value}便`;
  });
  section.dataset.runtimeFavoriteOwner = "v6";
}

function navMeta(button) {
  const current = $(".bottom-nav [data-nav].is-active")?.dataset.nav;
  const next = button?.dataset.nav;
  if (!current || !next || current === next) return null;
  const from = NAV_ORDER.indexOf(current);
  const to = NAV_ORDER.indexOf(next);
  return { current, next, direction: from >= 0 && to >= 0 && to < from ? "back" : "forward" };
}

function replayNavClick(button) {
  navReplayGuard = true;
  try { button.click(); } finally { navReplayGuard = false; }
}

function transitionNavigation(button, event) {
  if (navReplayGuard || navTransitionRunning) return false;
  const meta = navMeta(button);
  if (!meta) return false;

  document.body.dataset.runtimeNavDirection = meta.direction;
  if (reducedMotion() || typeof Element.prototype.animate !== "function") return false;

  const activeView = $(".view.is-active");
  if (!activeView) return false;

  event.preventDefault();
  event.stopImmediatePropagation();
  navTransitionRunning = true;
  const dx = meta.direction === "back" ? 3 : -3;
  const exit = activeView.animate(
    [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0.74, transform: `translateX(${dx}px)` }
    ],
    { duration: 105, easing: "cubic-bezier(.4,0,1,1)", fill: "both" }
  );

  const finish = () => {
    exit.cancel();
    replayNavClick(button);
    navTransitionRunning = false;
    window.setTimeout(() => delete document.body.dataset.runtimeNavDirection, 380);
  };
  exit.finished.then(finish, finish);
  return true;
}

function markDomSwap() {
  document.body.classList.add("runtime-dom-swap");
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("runtime-dom-swap")));
}

function bindInteractions() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const nav = target.closest(".bottom-nav [data-nav]");
    if (nav && transitionNavigation(nav, event)) return;

    const changedKey = interactionChoiceKey(target);
    if (!changedKey) return;

    activeChoiceKey = changedKey;
    snapshotChoiceGeometry();
    markDomSwap();
    queueMicrotask(() => {
      normalizeChoices(changedKey);
      normalizeFavoriteSection();
      requestAnimationFrame(() => { activeChoiceKey = null; });
    });
  }, true);
}

function observeStructuralRebuilds() {
  structuralObserver = new MutationObserver(() => {
    // A choice click already owns this rebuild and will animate only its own track.
    // Do not let the structural observer immediately reset/cancel that animation.
    if (activeChoiceKey || normalizeQueued) return;
    normalizeQueued = true;
    queueMicrotask(() => {
      normalizeQueued = false;
      normalizeChoices(null);
      normalizeFavoriteSection();
    });
  });

  const home = $("#home-destination-chips");
  const timetable = $("#timetable-route-controls");
  if (home) structuralObserver.observe(home, { childList: true });
  if (timetable) structuralObserver.observe(timetable, { childList: true });

  const favorites = $("#favorite-trips-v6");
  if (favorites) {
    favoriteObserver = new MutationObserver(normalizeFavoriteSection);
    favoriteObserver.observe(favorites, { childList: true, subtree: true, characterData: true });
  }
}

function init() {
  document.body.classList.add("ui-v7", "ui-motion-v2");
  installStyles();
  snapshotChoiceGeometry();
  normalizeChoices(null);
  normalizeFavoriteSection();
  bindInteractions();
  observeStructuralRebuilds();
  window.setTimeout(() => normalizeChoices(null), 120);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
