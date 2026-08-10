const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ICONS = Object.freeze({
  refresh: '<path d="M20 6v5h-5"/><path d="M20 11a8 8 0 1 0-2.35 5.66"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  sliders: '<path d="M4 7h6M14 7h6M4 12h3M11 12h9M4 17h9M17 17h3"/><circle cx="12" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>',
  swap: '<path d="M8 4v16M8 4 5 7M8 4l3 3M16 20V4m0 16-3-3m3 3 3-3"/>',
  chevronDown: '<path d="m7 10 5 5 5-5"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>'
});

function iconSvg(name) {
  return `<svg class="v11-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.chevronRight}</svg>`;
}

function installStyles() {
  if ($('link[data-ui-v11]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-v11.css";
  link.dataset.uiV11 = "true";
  document.head.append(link);
}

function setIcon(node, name) {
  if (!node || node.dataset.v11Icon === name) return;
  node.innerHTML = iconSvg(name);
  node.dataset.v11Icon = name;
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

let queued = false;
function normalizeUi() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    normalizeUtilityIcons();
    normalizeSaveConditionCopy();
  });
}

function observeUi() {
  const root = $(".app-shell");
  if (!root) return;
  const observer = new MutationObserver(normalizeUi);
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"]
  });
}

function init() {
  document.body.classList.add("ui-v11");
  installStyles();
  normalizeUtilityIcons();
  normalizeSaveConditionCopy();
  observeUi();
  window.setTimeout(normalizeUi, 150);
  window.setTimeout(normalizeUi, 500);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
