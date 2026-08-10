const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let normalizeQueued = false;
let navResizeObserver = null;

function installStyles() {
  if ($('link[data-ui-v15]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-v15.css";
  link.dataset.uiV15 = "true";
  document.head.append(link);
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
  const x = Math.max(0, activeRect.left - navRect.left + inset);
  const width = Math.max(0, activeRect.width - inset * 2);
  nav.style.setProperty("--v15-nav-glider-x", `${x}px`);
  nav.style.setProperty("--v15-nav-glider-width", `${width}px`);
  requestAnimationFrame(() => nav.classList.add("nav-glider-ready-v15"));
}

function auditInstallGuideResolution() {
  $$(".install-guide-media img").forEach((img) => {
    const media = img.closest(".install-guide-media");
    if (!media) return;
    const assess = () => {
      if (!img.naturalWidth) return;
      media.classList.toggle("is-low-res-source-v15", img.naturalWidth < 360);
      media.dataset.sourceWidth = String(img.naturalWidth);
    };
    if (img.complete) assess();
    if (img.dataset.v15ResolutionBound !== "true") {
      img.dataset.v15ResolutionBound = "true";
      img.addEventListener("load", assess, { passive: true });
    }
  });
}

function normalizeNavigationA11y() {
  $$(".bottom-nav [data-nav]").forEach((button) => {
    if (button.classList.contains("is-active")) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function normalizeUi() {
  if (normalizeQueued) return;
  normalizeQueued = true;
  requestAnimationFrame(() => {
    normalizeQueued = false;
    ensureNavGlider();
    normalizeNavigationA11y();
    auditInstallGuideResolution();
    updateNavGlider();
    document.documentElement.dataset.uiReady = "v15";
  });
}

function observeDynamicUi() {
  const root = $(".app-shell") || document.body;
  const observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || (record.type === "attributes" && ["class", "src"].includes(record.attributeName)))) {
      normalizeUi();
    }
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "src"] });
}

function init() {
  document.body.classList.add("ui-v15");
  installStyles();
  normalizeUi();
  observeDynamicUi();
  window.addEventListener("resize", () => updateNavGlider(), { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(() => updateNavGlider(), 80), { passive: true });
  window.setTimeout(normalizeUi, 140);
  window.setTimeout(normalizeUi, 480);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
