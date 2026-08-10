const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const INSTALL_GUIDE_SOURCES = Object.freeze([
  "./assets/help/install/ios-01-share.webp",
  "./assets/help/install/ios-02-add-home.webp",
  "./assets/help/install/ios-03-confirm.webp"
]);

const ICONS = Object.freeze({
  refresh: '<path d="M20 6v5h-5"/><path d="M20 11a8 8 0 1 0-2.35 5.66"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  sliders: '<path d="M4 7h6M14 7h6M4 12h3M11 12h9M4 17h9M17 17h3"/><circle cx="12" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>',
  swap: '<path d="M8 4v16M8 4 5 7M8 4l3 3M16 20V4m0 16-3-3m3 3 3-3"/>',
  chevronDown: '<path d="m7 10 5 5 5-5"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>'
});

const INTERACTION_SELECTOR = [
  ".bottom-nav [data-nav]",
  "#search-now-button",
  "#arrival-search-button",
  "#open-search-button",
  ".search-submit",
  "[data-result-step]",
  ".route-shortcut"
].join(",");

let normalizeQueued = false;
let navResizeObserver = null;
let nativeDialogClose = null;
let nativeScrollIntoView = null;

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function installStyles() {
  if ($('link[data-ui-runtime]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-runtime.css";
  link.dataset.uiRuntime = "true";
  document.head.append(link);
}

function preserveLegacyStyleScopes() {
  // Visual CSS from v11/v14/v15 remains as a compatibility layer, but their JS is retired.
  document.body.classList.add("ui-v11", "ui-v14", "ui-v15", "ui-runtime");
}

function iconSvg(name) {
  return `<svg class="v11-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.chevronRight}</svg>`;
}

function setIcon(node, name) {
  if (!node || node.dataset.runtimeIcon === name) return;
  node.innerHTML = iconSvg(name);
  node.dataset.runtimeIcon = name;
}

function normalizeUtilityIcons() {
  setIcon($("#refresh-button"), "refresh");
  setIcon($("#swap-button"), "swap");
  setIcon($("#home-origin-button .chevron"), "chevronDown");
  setIcon($(".search-timing-button .search-summary-icon"), "clock");
  setIcon($(".search-condition-button .search-summary-icon"), "sliders");
  $$(".search-summary-chevron").forEach((node) => setIcon(node, "chevronRight"));
  $$(".tt-compact-chevron").forEach((node) => setIcon(node, "chevronRight"));
  $$(".compact-saved-open > span[aria-hidden='true']:last-child").forEach((node) => setIcon(node, "chevronRight"));
  const nowIcon = $(".search-now-choice > span:first-child");
  if (nowIcon) setIcon(nowIcon, "clock");
}

function normalizeSaveConditionCopy() {
  const button = $("#favorite-current-button");
  if (!button) return;
  const text = button.textContent.trim();
  const next = /保存済み/.test(text) ? "保存済み" : "条件を保存";
  if (text !== next) button.textContent = next;
}

function normalizeNextBusCue() {
  $$(".tt-next-mini").forEach((node) => {
    if (node.textContent.trim() !== "次の便") node.textContent = "次の便";
    node.setAttribute("aria-label", "現在時刻から次に乗れる便");
  });
}

function normalizeNavigationA11y() {
  $$(".bottom-nav [data-nav]").forEach((button) => {
    if (button.classList.contains("is-active")) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function ensureNavGlider() {
  const nav = $(".bottom-nav");
  if (!nav) return;
  let glider = $(".nav-glider-v15", nav);
  if (!glider) {
    glider = document.createElement("span");
    glider.className = "nav-glider-v15";
    glider.setAttribute("aria-hidden", "true");
    nav.prepend(glider);
  }
  updateNavGlider(nav);
  if (!navResizeObserver && typeof ResizeObserver !== "undefined") {
    navResizeObserver = new ResizeObserver(() => updateNavGlider(nav));
    navResizeObserver.observe(nav);
  }
}

function updateNavGlider(nav = $(".bottom-nav")) {
  if (!nav) return;
  const active = $("button.is-active", nav);
  if (!active) {
    nav.classList.remove("nav-glider-ready-v15");
    return;
  }
  const navRect = nav.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  if (!navRect.width || !activeRect.width) return;
  const inset = 1;
  nav.style.setProperty("--v15-nav-glider-x", `${Math.max(0, activeRect.left - navRect.left + inset)}px`);
  nav.style.setProperty("--v15-nav-glider-width", `${Math.max(0, activeRect.width - inset * 2)}px`);
  nav.classList.add("nav-glider-ready-v15");
}

function normalizeResultStepper() {
  const previous = $('[data-result-step="-1"]');
  const next = $('[data-result-step="1"]');
  if (previous && previous.dataset.runtimeCopy !== "true") {
    previous.textContent = "‹  前の便";
    previous.dataset.runtimeCopy = "true";
  }
  if (next && next.dataset.runtimeCopy !== "true") {
    next.textContent = "次の便  ›";
    next.dataset.runtimeCopy = "true";
  }
  const status = $("#result-step-status");
  if (status && status.textContent.trim() === "前後の便") status.textContent = "便を移動";
}

function stabilizeInstallGuide() {
  $$(".install-guide-media img").forEach((img, index) => {
    const media = img.closest(".install-guide-media");
    const src = INSTALL_GUIDE_SOURCES[index];
    if (src && !img.getAttribute("src")?.includes(src.replace("./", ""))) img.src = src;
    if (!media) return;
    const assess = () => {
      if (!img.naturalWidth) return;
      media.classList.toggle("is-low-res-source-v15", img.naturalWidth < 360);
      media.dataset.sourceWidth = String(img.naturalWidth);
    };
    if (img.complete) assess();
    if (img.dataset.runtimeResolutionBound !== "true") {
      img.dataset.runtimeResolutionBound = "true";
      img.addEventListener("load", assess, { passive: true });
    }
  });
}

function installDialogMotion() {
  if (nativeDialogClose || typeof HTMLDialogElement === "undefined") return;
  nativeDialogClose = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.close = function runtimeClose(returnValue) {
    if (!this.open || reducedMotion()) return nativeDialogClose.call(this, returnValue);
    if (this.classList.contains("runtime-closing")) return;
    this.classList.add("runtime-closing");
    window.setTimeout(() => {
      nativeDialogClose.call(this, returnValue);
      this.classList.remove("runtime-closing");
    }, 170);
  };
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
  window.scrollTo({ top, behavior: "smooth" });
  element.classList.remove("runtime-jump-target");
  window.setTimeout(() => {
    element.classList.add("runtime-jump-target");
    window.setTimeout(() => element.classList.remove("runtime-jump-target"), 680);
  }, 220);
}

function installTimetableScrollSmoother() {
  if (nativeScrollIntoView || typeof Element === "undefined") return;
  nativeScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function runtimeScrollIntoView(options) {
    if (
      document.body?.classList.contains("ui-runtime") &&
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
    normalizeUtilityIcons();
    normalizeSaveConditionCopy();
    normalizeNextBusCue();
    normalizeNavigationA11y();
    ensureNavGlider();
    normalizeResultStepper();
    stabilizeInstallGuide();
    document.documentElement.dataset.uiReady = "runtime";
  });
}

function bindInteractionNormalization() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest(INTERACTION_SELECTOR) : null;
    if (!target) return;
    requestAnimationFrame(normalizeUi);
  }, true);
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches("#default-campus, #default-suita-stop, #tt-suita-stop, #origin-campus, #destination-campus")) {
      requestAnimationFrame(normalizeUi);
    }
  }, true);
}

function observeDynamicUi() {
  // Only content that actually introduces runtime-owned icons/copy is observed here.
  const contentObserver = new MutationObserver(() => normalizeUi());
  [$("#search-results"), $("#timetable-list"), $("#view-settings")].filter(Boolean).forEach((root) => {
    contentObserver.observe(root, { childList: true, subtree: true });
  });
}

function init() {
  preserveLegacyStyleScopes();
  installStyles();
  installDialogMotion();
  installTimetableScrollSmoother();
  bindInteractionNormalization();
  observeDynamicUi();
  normalizeUi();
  window.addEventListener("resize", normalizeUi, { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(normalizeUi, 80), { passive: true });
  window.setTimeout(normalizeUi, 150);
  window.setTimeout(normalizeUi, 480);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
