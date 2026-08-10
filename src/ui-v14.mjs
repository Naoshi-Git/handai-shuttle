const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let normalizeQueued = false;

function installStyles() {
  if ($('link[data-ui-v14]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-v14.css";
  link.dataset.uiV14 = "true";
  document.head.append(link);
}

function normalizeNextBusCue() {
  $$(".tt-next-mini").forEach((node) => {
    if (node.textContent.trim() !== "次の便") node.textContent = "次の便";
    node.setAttribute("aria-label", "現在時刻から次に乗れる便");
  });
}

function normalizeNavigation() {
  $$(".bottom-nav [data-nav]").forEach((button) => {
    if (button.classList.contains("is-active")) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function markReadyLayer() {
  document.documentElement.dataset.uiReady = "v14";
}

function normalizeUi() {
  if (normalizeQueued) return;
  normalizeQueued = true;
  requestAnimationFrame(() => {
    normalizeQueued = false;
    normalizeNextBusCue();
    normalizeNavigation();
    markReadyLayer();
  });
}

function observeDynamicUi() {
  const root = $(".app-shell") || document.body;
  const observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || (record.type === "attributes" && record.attributeName === "class"))) {
      normalizeUi();
    }
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}

function init() {
  document.body.classList.add("ui-v14");
  installStyles();
  normalizeUi();
  observeDynamicUi();
  window.setTimeout(normalizeUi, 160);
  window.setTimeout(normalizeUi, 520);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
