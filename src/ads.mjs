const ADS_MODE_KEY = "handai-shuttle:ads-mode";
const DEFAULT_MODE = "house";

export const AD_PLACEMENTS = Object.freeze({
  HOME_FEED: "home-feed",
  SEARCH_RESULTS: "search-results",
  TIMETABLE_FEED: "timetable-feed"
});

const HOUSE_CREATIVES = Object.freeze({
  standard: {
    svgSrc: "./assets/ads/house/house-mobile-320x100.svg",
    pngSrc: "./assets/ads/house/house-mobile-320x100.png",
    width: 320,
    height: 100,
    ratio: "16 / 5",
    alt: "友達にも、次の便を。阪大シャトルを共有"
  },
  compact: {
    svgSrc: "./assets/ads/house/house-mobile-320x50.svg",
    pngSrc: "./assets/ads/house/house-mobile-320x50.png",
    width: 320,
    height: 50,
    ratio: "32 / 5",
    alt: "友達にも、次の便を。阪大シャトルを共有"
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
  const creative = placement === AD_PLACEMENTS.TIMETABLE_FEED
    ? HOUSE_CREATIVES.compact
    : HOUSE_CREATIVES.standard;

  return `
    <aside class="ad-card house-ad-card" data-ad-provider="house" aria-label="阪大シャトルの自社広告">
      <div class="ad-card-label"><span>自社広告</span></div>
      <button class="house-ad-creative" type="button" data-house-share aria-label="阪大シャトルを友達に共有する" style="--house-ad-ratio:${creative.ratio}">
        <picture>
          <source srcset="${creative.svgSrc}" type="image/svg+xml">
          <img src="${creative.pngSrc}" width="${creative.width}" height="${creative.height}" alt="${creative.alt}" decoding="async">
        </picture>
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

function createSlot(placement) {
  const slot = document.createElement("div");
  slot.className = `ad-slot ad-slot-${placement}`;
  slot.dataset.adSlot = placement;
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

function insertHomeSlot() {
  if (document.querySelector(`[data-ad-slot="${AD_PLACEMENTS.HOME_FEED}"]`)) return;
  const upcomingSection = document.querySelector("#view-home .content-section.compact-section");
  if (!upcomingSection) return;
  upcomingSection.insertAdjacentElement("afterend", createSlot(AD_PLACEMENTS.HOME_FEED));
}

function insertSearchSlot() {
  const container = document.querySelector("#search-results");
  if (!container || container.querySelector(`[data-ad-slot="${AD_PLACEMENTS.SEARCH_RESULTS}"]`)) return;
  const cards = [...container.children].filter((node) => node.matches?.(".journey-card, .round-result, .round-trip-card"));
  if (cards.length < 2) return;
  cards[1].insertAdjacentElement("afterend", createSlot(AD_PLACEMENTS.SEARCH_RESULTS));
}

function insertTimetableSlot() {
  const container = document.querySelector("#timetable-list");
  if (!container || container.querySelector(`[data-ad-slot="${AD_PLACEMENTS.TIMETABLE_FEED}"]`)) return;
  const rows = [...container.children].filter((node) => node.matches?.("[data-tt-trip], .timetable-card"));
  if (rows.length < 5) return;
  rows[4].insertAdjacentElement("afterend", createSlot(AD_PLACEMENTS.TIMETABLE_FEED));
}

export function refreshAdSlots() {
  if (getAdsMode() === "off") {
    document.querySelectorAll("[data-ad-slot]").forEach((slot) => slot.remove());
    return;
  }
  insertHomeSlot();
  insertSearchSlot();
  insertTimetableSlot();
}

function observeDynamicFeeds() {
  const targets = [document.querySelector("#search-results"), document.querySelector("#timetable-list")].filter(Boolean);
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
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAds, { once: true });
  else initAds();
}
