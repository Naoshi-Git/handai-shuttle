const ADS_MODE_KEY = "handai-shuttle:ads-mode";
const DEFAULT_MODE = "house";

export const AD_PLACEMENTS = Object.freeze({
  HOME_FEED: "home-feed",
  SEARCH_RESULTS: "search-results",
  TIMETABLE_FEED: "timetable-feed"
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
    const original = button.textContent;
    button.textContent = "リンクをコピーしました";
    window.setTimeout(() => { button.textContent = original; }, 1800);
  } catch (error) {
    if (error?.name !== "AbortError") console.warn("Handai Shuttle share failed", error);
  }
}

function houseAdMarkup(placement) {
  const compact = placement === AD_PLACEMENTS.TIMETABLE_FEED;
  return `
    <article class="ad-card house-ad-card ${compact ? "is-compact" : ""}" data-ad-provider="house">
      <div class="ad-card-label"><span>阪大シャトルからのお知らせ</span><span class="ad-card-kind">自社案内</span></div>
      <div class="ad-card-body">
        <img class="ad-card-icon" src="./assets/brand/brand-icon-rounded.svg" alt="" aria-hidden="true">
        <div class="ad-card-copy">
          <strong>${compact ? "友達にも、次の便を。" : "阪大シャトルを友達におすすめしよう"}</strong>
          <p>${compact ? "便利だったら共有してみませんか？" : "豊中・箕面・吹田の移動を、もっと迷わず。リンクを友達に共有できます。"}</p>
        </div>
        <button class="ad-card-cta" type="button" data-house-share>共有する</button>
      </div>
    </article>`;
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
  const cards = [...container.children].filter((node) =>
    node.matches?.(".journey-card, .round-result, .round-trip-card")
  );
  if (cards.length < 2) return;
  cards[1].insertAdjacentElement("afterend", createSlot(AD_PLACEMENTS.SEARCH_RESULTS));
}

function insertTimetableSlot() {
  const container = document.querySelector("#timetable-list");
  if (!container || container.querySelector(`[data-ad-slot="${AD_PLACEMENTS.TIMETABLE_FEED}"]`)) return;
  const rows = [...container.children].filter((node) =>
    node.matches?.("[data-tt-trip], .timetable-card")
  );
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
  const targets = [
    document.querySelector("#search-results"),
    document.querySelector("#timetable-list")
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
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAds, { once: true });
  } else {
    initAds();
  }
}
