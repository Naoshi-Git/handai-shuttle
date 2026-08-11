const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const LOCATION_SOURCE_KEY = "ou-bus:location-source-v12";
const COMPACT_AD_SRC = "./assets/ads/house/v2/house-banner-simple-640x89.webp";
const INSTALL_GUIDE_IMAGES = Object.freeze([
  { src: "./assets/help/install/ios-01-share.webp", title: "1. Safariの共有を開く", copy: "画面下部の共有ボタンをタップします。" },
  { src: "./assets/help/install/ios-02-add-home.webp", title: "2. ホーム画面に追加", copy: "共有メニューから「ホーム画面に追加」を選びます。" },
  { src: "./assets/help/install/ios-03-confirm.webp", title: "3. 追加を確定", copy: "表示名を確認して右上の「追加」をタップします。" }
]);

let normalizeQueued = false;
let locationObserver = null;
let dynamicObserver = null;
let detailSheetObserver = null;
let observedDetailSheet = null;

function installStyles() {
  if ($('link[data-ui-v12]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-v12.css";
  link.dataset.uiV12 = "true";
  document.head.append(link);
}

function finishBoot() {
  let finished = false;
  const root = document.documentElement;
  const minimumMs = Number(root.dataset.bootMinMs || 960);
  const maximumMs = Number(root.dataset.bootMaxMs || 1500);
  const finish = () => {
    if (finished) return;
    finished = true;
    document.body.classList.remove("app-booting");
    document.body.classList.add("app-ready");
    const boot = $("#app-boot");
    window.setTimeout(() => boot?.remove(), 300);
  };
  const elapsed = typeof performance !== "undefined" ? performance.now() : minimumMs;
  const minimum = Math.max(0, minimumMs - elapsed);
  const fonts = document.fonts?.ready || Promise.resolve();
  Promise.allSettled([fonts, new Promise((resolve) => window.setTimeout(resolve, minimum))])
    .then(() => requestAnimationFrame(() => requestAnimationFrame(finish)));
  window.setTimeout(finish, maximumMs);
}

function hideLegacyRefresh() {
  const button = $("#refresh-button");
  if (!button) return;
  button.hidden = true;
  button.tabIndex = -1;
  button.setAttribute("aria-hidden", "true");
}

function currentCampusLabel() {
  return $("#home-origin-label")?.textContent?.trim() || "選択したキャンパス";
}

function setManualLocationState(label = currentCampusLabel()) {
  const button = $("#locate-button");
  if (!button) return;
  localStorage.setItem(LOCATION_SOURCE_KEY, "manual");
  button.dataset.locationState = "manual";
  button.title = `手動選択：${label}`;
  button.setAttribute("aria-label", button.title);
}

function bindLocationSource() {
  const locate = $("#locate-button");
  if (!locate) return;

  $("#campus-options")?.addEventListener("click", (event) => {
    const choice = event.target.closest?.("[data-campus-choice]");
    if (!choice) return;
    const label = $("strong", choice)?.textContent?.trim() || choice.dataset.campusChoice || "キャンパス";
    setManualLocationState(label);
    window.setTimeout(() => setManualLocationState(label), 40);
    window.setTimeout(() => setManualLocationState(label), 180);
  }, true);

  locate.addEventListener("click", () => {
    localStorage.setItem(LOCATION_SOURCE_KEY, "auto");
  }, true);

  if (localStorage.getItem(LOCATION_SOURCE_KEY) === "manual" && locate.dataset.locationState !== "loading") {
    setManualLocationState();
  }

  locationObserver = new MutationObserver(() => {
    const source = localStorage.getItem(LOCATION_SOURCE_KEY);
    const state = locate.dataset.locationState || "";
    if (source === "manual" && state !== "loading") {
      if (state !== "manual") setManualLocationState();
      return;
    }
    if (state === "matched") localStorage.setItem(LOCATION_SOURCE_KEY, "auto");
  });
  locationObserver.observe(locate, { attributes: true, attributeFilter: ["data-location-state", "title"], childList: true, subtree: true });
}

function normalizeNextBusCue() {
  $$(".tt-next-mini").forEach((node) => {
    if (node.textContent.trim() !== "次の便") node.textContent = "次の便";
  });
}

function shareApp() {
  const url = new URL(window.location.href);
  url.hash = "";
  const payload = { title: "阪大シャトル", text: "阪大の学内連絡バス、次の便がすぐわかる。", url: url.toString() };
  if (navigator.share) return navigator.share(payload).catch((error) => {
    if (error?.name !== "AbortError") console.warn("Share failed", error);
  });
  return navigator.clipboard?.writeText(`${payload.text}\n${payload.url}`).catch(() => {});
}

function detailAdMarkup() {
  return `
    <aside class="ad-card house-ad-card" data-ad-provider="house" aria-label="阪大シャトルの自社広告">
      <div class="ad-card-label"><span>自社広告</span></div>
      <button class="house-ad-creative" type="button" data-v12-detail-ad-share aria-label="阪大シャトルを友達に共有する" style="--house-ad-ratio:640 / 89">
        <img src="${COMPACT_AD_SRC}" width="640" height="89" alt="阪大シャトル。次の便、すぐわかる。共有" decoding="async">
      </button>
    </aside>`;
}

function ensureDetailAd() {
  const dialog = $("#tt-detail-sheet");
  const stops = $("#tt-sheet-stops", dialog || document);
  if (!dialog || !stops || $(".ad-slot-timetable-detail", dialog)) return;
  const slot = document.createElement("div");
  slot.className = "ad-slot ad-slot-timetable-detail";
  slot.dataset.adSlot = "timetable-detail";
  slot.dataset.adSlotKey = "timetable-detail-sheet";
  slot.innerHTML = detailAdMarkup();
  slot.querySelector("[data-v12-detail-ad-share]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void shareApp();
  });
  stops.insertAdjacentElement("afterend", slot);
}

function observeDetailSheet() {
  const dialog = $("#tt-detail-sheet");
  if (!dialog || dialog === observedDetailSheet) {
    ensureDetailAd();
    return;
  }
  detailSheetObserver?.disconnect();
  observedDetailSheet = dialog;
  detailSheetObserver = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList")) ensureDetailAd();
  });
  detailSheetObserver.observe(dialog, { childList: true, subtree: true });
  ensureDetailAd();
}

function bindDetailSheetLifecycle() {
  observeDetailSheet();
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("#timetable-list [data-tt-trip]") : null;
    if (!target) return;
    window.setTimeout(observeDetailSheet, 0);
  });
}

function settingsSectionMeta(card) {
  if (card.matches("[data-pwa-settings]")) return { title: "ホーム画面に追加", subtitle: "追加方法・最新版の確認" };
  if (card.id === "suita-stop-preferences-v9") return { title: "吹田のバス停", subtitle: "乗る停留所・着く停留所" };
  if ($("#default-campus", card)) return { title: "現在地の初期設定", subtitle: "位置情報が使えない場合" };
  if (card.classList.contains("source-card")) return { title: "データと利用上の注意", subtitle: "公式時刻表・利用条件" };
  if (card.classList.contains("crowding-info-card")) return { title: "混雑予想について", subtitle: "予測ロジックと凡例" };
  const heading = $("h3", card)?.textContent?.trim() || $(".v9-settings-copy h3", card)?.textContent?.trim() || "設定";
  const firstParagraph = $("p", card)?.textContent?.trim() || "タップして設定";
  return { title: heading, subtitle: firstParagraph.length > 34 ? `${firstParagraph.slice(0, 34)}…` : firstParagraph };
}

function chevronMarkup() {
  return '<svg class="v11-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
}

function wrapSettingsCard(card) {
  if (!card || card.dataset.v12Wrapped === "true") return;
  if (["favorite-trips-v6", "saved-searches-v6"].includes(card.id)) return;
  if (card.closest(".settings-disclosure")) return;

  const meta = settingsSectionMeta(card);
  const details = document.createElement("details");
  details.className = "settings-disclosure";
  details.dataset.v12Disclosure = "true";
  const summary = document.createElement("summary");
  summary.innerHTML = `
    <span class="settings-disclosure-title"><strong>${meta.title}</strong><small>${meta.subtitle}</small></span>
    <span class="settings-disclosure-chevron" aria-hidden="true">${chevronMarkup()}</span>`;
  card.before(details);
  details.append(summary, card);
  card.dataset.v12Wrapped = "true";
}

function normalizeSettingsInformationArchitecture() {
  const settings = $("#view-settings");
  if (!settings) return;
  $$(":scope > .settings-card", settings).forEach(wrapSettingsCard);

  const favorites = $("#favorite-trips-v6", settings);
  const searches = $("#saved-searches-v6", settings);
  const firstDisclosure = $(".settings-disclosure", settings);
  const heading = $(":scope > .page-heading", settings);
  let anchor = heading;
  if (favorites && anchor) {
    anchor.insertAdjacentElement("afterend", favorites);
    anchor = favorites;
  }
  if (searches && anchor) {
    anchor.insertAdjacentElement("afterend", searches);
    anchor = searches;
  }
  if (firstDisclosure && anchor && firstDisclosure.previousElementSibling !== anchor) {
    anchor.insertAdjacentElement("afterend", firstDisclosure);
  }
}

function installGuideCarousel() {
  const guide = $("[data-pwa-settings] .pwa-install-guide");
  if (!guide || guide.dataset.v12Carousel === "true") return;
  guide.dataset.v12Carousel = "true";
  guide.innerHTML = `
    <div class="install-guide-carousel">
      <div class="install-guide-track" data-install-guide-track>
        ${INSTALL_GUIDE_IMAGES.map((item, index) => `
          <article class="install-guide-slide" data-install-slide="${index}">
            <div class="install-guide-media" data-install-media>
              <img alt="${item.title}" loading="lazy" decoding="async">
              <div class="install-guide-placeholder">スクリーンショットを追加予定<br>${item.title}</div>
            </div>
            <strong>${item.title}</strong>
            <p>${item.copy}</p>
          </article>`).join("")}
      </div>
      <div class="install-guide-dots" aria-hidden="true">${INSTALL_GUIDE_IMAGES.map((_, index) => `<button type="button" class="install-guide-dot ${index === 0 ? "is-active" : ""}" data-install-dot="${index}" tabindex="-1"></button>`).join("")}</div>
    </div>`;

  INSTALL_GUIDE_IMAGES.forEach((item, index) => {
    const slide = $(`[data-install-slide="${index}"]`, guide);
    const media = $("[data-install-media]", slide);
    const img = $("img", media);
    if (!img || !media) return;
    const probe = new Image();
    probe.onload = () => {
      img.src = item.src;
      media.classList.add("has-image");
    };
    probe.src = item.src;
  });

  const track = $("[data-install-guide-track]", guide);
  const dots = $$("[data-install-dot]", guide);
  let scrollQueued = false;
  track?.addEventListener("scroll", () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const slides = $$("[data-install-slide]", track);
      if (!slides.length) return;
      const targetX = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let distance = Infinity;
      slides.forEach((slide, index) => {
        const center = slide.offsetLeft + slide.offsetWidth / 2;
        const nextDistance = Math.abs(center - targetX);
        if (nextDistance < distance) { nearest = index; distance = nextDistance; }
      });
      dots.forEach((dot, index) => dot.classList.toggle("is-active", index === nearest));
    });
  }, { passive: true });
}

function normalizeUi() {
  if (normalizeQueued) return;
  normalizeQueued = true;
  requestAnimationFrame(() => {
    normalizeQueued = false;
    normalizeNextBusCue();
    normalizeSettingsInformationArchitecture();
    installGuideCarousel();
  });
}

function observeDynamicUi() {
  const roots = [$("#view-settings"), $("#timetable-list")].filter(Boolean);
  if (!roots.length || dynamicObserver) return;
  dynamicObserver = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" && (record.addedNodes.length || record.removedNodes.length))) normalizeUi();
  });
  roots.forEach((root) => dynamicObserver.observe(root, { childList: true, subtree: true }));
}

function init() {
  document.body.classList.add("ui-v12");
  installStyles();
  hideLegacyRefresh();
  bindLocationSource();
  normalizeUi();
  observeDynamicUi();
  bindDetailSheetLifecycle();
  finishBoot();
  window.setTimeout(normalizeUi, 260);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
