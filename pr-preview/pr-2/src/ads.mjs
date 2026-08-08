const ADS_MODE_KEY = "handai-shuttle:ads-mode";
const DEFAULT_MODE = "house";

export const AD_PLACEMENTS = Object.freeze({
  HOME_FEED: "home-feed",
  SEARCH_PRIMARY: "search-primary",
  SEARCH_INLINE: "search-inline",
  TIMETABLE_HEADER: "timetable-header",
  TIMETABLE_INLINE: "timetable-inline"
});

const HOUSE_CREATIVES = Object.freeze({
  [AD_PLACEMENTS.HOME_FEED]: {
    src: "./assets/ads/house/v2/house-banner-simple-640x89.webp",
    width: 640,
    height: 89,
    ratio: "640 / 89",
    alt: "阪大シャトル。次の便、すぐわかる。共有"
  },
  [AD_PLACEMENTS.SEARCH_PRIMARY]: {
    src: "./assets/ads/house/v2/house-banner-feature-640x213.webp",
    width: 640,
    height: 213,
    ratio: "640 / 213",
    alt: "阪大シャトル。次の便、最終便、混雑目安。友達に送る"
  },
  [AD_PLACEMENTS.SEARCH_INLINE]: {
    src: "./assets/ads/house/v2/house-banner-simple-640x89.webp",
    width: 640,
    height: 89,
    ratio: "640 / 89",
    alt: "阪大シャトル。次の便、すぐわかる。共有"
  },
  [AD_PLACEMENTS.TIMETABLE_HEADER]: {
    src: "./assets/ads/house/v2/house-banner-simple-640x89.webp",
    width: 640,
    height: 89,
    ratio: "640 / 89",
    alt: "阪大シャトル。次の便、すぐわかる。共有"
  },
  [AD_PLACEMENTS.TIMETABLE_INLINE]: {
    src: "./assets/ads/house/v2/house-banner-simple-640x89.webp",
    width: 640,
    height: 89,
    ratio: "640 / 89",
    alt: "阪大シャトル。次の便、すぐわかる。共有"
  }
});

export function getAdsMode() {
  try {
    return localStorage.getItem(ADS_MODE_KEY) || DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function installStyles() {
  if (document.querySelector('link[data-ads-ui]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./ads.css";
  link.dataset.adsUi = "true";
  document.head.append(link);
}

function shareUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

async function shareHandaiShuttle(button) {
  const payload = {
    title: "阪大シャトル",
    text: "阪大の学内連絡バス、次の便がすぐわかる。阪大シャトルを使ってみて。",
    url: shareUrl()
  };

  try {
    if (navigator.share) {
      await navigator.share(payload);
      return;
    }
    await navigator.clipboard?.writeText(`${payload.text}\n${payload.url}`);
    button.dataset.feedback = "copied";
    window.setTimeout(() => { delete button.dataset.feedback; }, 1600);
  } catch (error) {
    if (error?.name !== "AbortError") console.warn("Handai Shuttle share failed", error);
  }
}

function houseAdMarkup(placement) {
  const creative = HOUSE_CREATIVES[placement] || HOUSE_CREATIVES[AD_PLACEMENTS.HOME_FEED];
  return `
    <aside class="ad-card house-ad-card" data-ad-provider="house" aria-label="阪大シャトルの自社広告">
      <div class="ad-card-label"><span>自社広告</span></div>
      <button class="house-ad-creative" type="button" data-house-share aria-label="阪大シャトルを友達に共有する" style="--house-ad-ratio:${creative.ratio}">
        <img src="${creative.src}" width="${creative.width}" height="${creative.height}" alt="${creative.alt}" decoding="async">
      </button>
    </aside>`;
}

function adsensePlaceholderMarkup() {
  return `
    <aside class="ad-card adsense-ad-card" data-ad-provider="adsense" aria-label="広告">
      <div class="ad-card-label"><span>広告</span></div>
      <div class="adsense-mount" data-adsense-mount aria-hidden="true"></div>
    </aside>`;
}

function createSlot(placement, key = placement) {
  const slot = document.createElement("div");
  slot.className = `ad-slot ad-slot-${placement}`;
  slot.dataset.adSlot = placement;
  slot.dataset.adSlotKey = key;
  const mode = getAdsMode();
  slot.dataset.adMode = mode;
  slot.innerHTML = mode === "adsense" ? adsensePlaceholderMarkup() : houseAdMarkup(placement);
  slot.querySelector("[data-house-share]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void shareHandaiShuttle(event.currentTarget);
  });
  return slot;
}

function slotExists(key) {
  return Boolean(document.querySelector(`[data-ad-slot-key="${key}"]`));
}

function insertHomeSlot() {
  if (slotExists(AD_PLACEMENTS.HOME_FEED)) return;
  const actions = document.querySelector("#view-home .quick-actions");
  if (!actions) return;
  actions.insertAdjacentElement("afterend", createSlot(AD_PLACEMENTS.HOME_FEED));
}

function insertSearchPrimarySlot() {
  if (slotExists(AD_PLACEMENTS.SEARCH_PRIMARY)) return;
  const form = document.querySelector("#search-form");
  if (!form) return;
  form.insertAdjacentElement("afterend", createSlot(AD_PLACEMENTS.SEARCH_PRIMARY));
}

function insertTimetableHeaderSlot() {
  if (slotExists(AD_PLACEMENTS.TIMETABLE_HEADER)) return;
  const controls = document.querySelector("#timetable-route-controls");
  if (!controls) return;
  controls.insertAdjacentElement("beforebegin", createSlot(AD_PLACEMENTS.TIMETABLE_HEADER));
}

function insertInlineSlots({ container, cardSelector, placement, every, max }) {
  if (!container) return;
  const cards = [...container.children].filter((node) => node.matches?.(cardSelector));
  for (let index = every - 1, count = 1; index < cards.length && count <= max; index += every, count += 1) {
    const key = `${placement}-${count}`;
    if (slotExists(key)) continue;
    cards[index].insertAdjacentElement("afterend", createSlot(placement, key));
  }
}

function insertSearchInlineSlots() {
  insertInlineSlots({
    container: document.querySelector("#search-results"),
    cardSelector: ".journey-card, .round-result, .round-trip-card",
    placement: AD_PLACEMENTS.SEARCH_INLINE,
    every: 4,
    max: 2
  });
}

function insertTimetableInlineSlots() {
  insertInlineSlots({
    container: document.querySelector("#timetable-list"),
    cardSelector: "[data-tt-trip], .timetable-card",
    placement: AD_PLACEMENTS.TIMETABLE_INLINE,
    every: 8,
    max: 2
  });
}

export function refreshAdSlots() {
  if (getAdsMode() === "off") {
    document.querySelectorAll("[data-ad-slot]").forEach((slot) => slot.remove());
    return;
  }
  insertHomeSlot();
  insertSearchPrimarySlot();
  insertTimetableHeaderSlot();
  insertSearchInlineSlots();
  insertTimetableInlineSlots();
}

function observeDynamicFeeds() {
  const targets = [
    document.querySelector("#search-results"),
    document.querySelector("#timetable-list"),
    document.querySelector("#view-timetable")
  ].filter(Boolean);
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refreshAdSlots();
    });
  });
  targets.forEach((target) => observer.observe(target, { childList: true, subtree: false }));
}

export function initAds() {
  installStyles();
  refreshAdSlots();
  observeDynamicFeeds();
  window.setTimeout(refreshAdSlots, 300);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAds, { once: true });
  else initAds();
}
