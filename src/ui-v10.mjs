const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const COMPACT_AD = Object.freeze({
  src: "./assets/ads/house/v2/house-banner-simple-640x89.webp",
  width: 640,
  height: 89,
  ratio: "640 / 89"
});

let adNormalizationQueued = false;
let adObserver = null;

function installStyles() {
  if ($('link[data-ui-v10]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-v10.css";
  link.dataset.uiV10 = "true";
  document.head.append(link);
}

function normalizeHouseAd(slot) {
  if (!slot || slot.dataset.adMode === "adsense") return;
  const creative = $(".house-ad-creative", slot);
  const image = $(".house-ad-creative img", slot);
  if (!creative || !image) return;

  slot.dataset.v10Compact = "true";
  creative.style.setProperty("--house-ad-ratio", COMPACT_AD.ratio);
  if (image.getAttribute("src") !== COMPACT_AD.src) image.setAttribute("src", COMPACT_AD.src);
  if (image.getAttribute("width") !== String(COMPACT_AD.width)) image.setAttribute("width", String(COMPACT_AD.width));
  if (image.getAttribute("height") !== String(COMPACT_AD.height)) image.setAttribute("height", String(COMPACT_AD.height));
  image.dataset.rasterFormat = "webp-source";
}

function normalizeHouseAds() {
  $$("[data-ad-slot]").forEach(normalizeHouseAd);
}

function queueAdNormalization() {
  if (adNormalizationQueued) return;
  adNormalizationQueued = true;
  requestAnimationFrame(() => {
    adNormalizationQueued = false;
    normalizeHouseAds();
  });
}

function observeAds() {
  const roots = [$("#view-home"), $("#view-search"), $("#view-timetable")].filter(Boolean);
  if (!roots.length || adObserver) {
    queueAdNormalization();
    return;
  }

  adObserver = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" && record.addedNodes.length)) queueAdNormalization();
  });
  roots.forEach((root) => adObserver.observe(root, { childList: true, subtree: true }));
  queueAdNormalization();
}

function init() {
  document.body.classList.add("ui-v10");
  installStyles();
  observeAds();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
