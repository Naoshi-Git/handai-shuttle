const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const FAVORITES_KEY = "ou-bus:favorite-trips";
const CAMPUS_LABELS = Object.freeze({ suita: "吹田", toyonaka: "豊中", minoh: "箕面" });

const AD_PNG_SPECS = Object.freeze({
  "home-feed": {
    src: "./assets/ads/house/v2/house-banner-simple-640x89.webp",
    width: 640,
    height: 89,
    radius: 12,
    scale: 2,
    background: "#FAFAFC"
  },
  "timetable-header": {
    src: "./assets/ads/house/v2/house-banner-simple-640x89.webp",
    width: 640,
    height: 89,
    radius: 12,
    scale: 2,
    background: "#FAFAFC"
  },
  "timetable-inline": {
    src: "./assets/ads/house/v2/house-banner-simple-640x89.webp",
    width: 640,
    height: 89,
    radius: 12,
    scale: 2,
    background: "#FAFAFC"
  },
  "search-inline": {
    src: "./assets/ads/house/v2/house-banner-feature-640x213.webp",
    width: 640,
    height: 213,
    radius: 18,
    scale: 2,
    background: "#FAFAFC"
  },
  "search-primary": {
    src: "./assets/ads/house/v2/house-rectangle-600x500.svg",
    width: 600,
    height: 500,
    radius: 18,
    scale: 2,
    background: "#F8F7FF"
  }
});

const pngRasterCache = new Map();

function installStyles() {
  if ($('link[data-ui-v7]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./ui-v7.css";
  link.dataset.uiV7 = "true";
  document.head.append(link);
}

function safeParse(value, fallback = []) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function readFavorites() {
  return safeParse(localStorage.getItem(FAVORITES_KEY), []);
}

function normalizeTripId(value) {
  return String(value || "").trim().replace(/便$/u, "");
}

function campusLabel(id, fallback = "") {
  return CAMPUS_LABELS[id] || fallback || id || "キャンパス";
}

function normalizeFavorite(item = {}) {
  const origin = item.origin || "suita";
  const destination = item.destination || (origin === "suita" ? "toyonaka" : "suita");
  return {
    ...item,
    source: "timetable",
    tripId: normalizeTripId(item.tripId),
    origin,
    destination,
    originName: campusLabel(origin, item.originName),
    destinationName: campusLabel(destination, item.destinationName),
    routeType: item.routeType || "運行便"
  };
}

function favoriteKey(item) {
  const normalized = normalizeFavorite(item);
  return [normalized.tripId, normalized.departure || "", normalized.arrival || "", normalized.origin, normalized.destination].join("|");
}

function writeFavorites(items) {
  const seen = new Set();
  const normalized = items.map(normalizeFavorite).filter((item) => {
    if (!item.tripId) return false;
    const key = favoriteKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(normalized.slice(0, 30)));
  return normalized;
}

function migrateFavorites() {
  writeFavorites(readFavorites());
}

function isFavorite(item) {
  const key = favoriteKey(item);
  return readFavorites().some((saved) => favoriteKey(saved) === key);
}

function toggleFavorite(item) {
  const normalized = normalizeFavorite(item);
  const key = favoriteKey(normalized);
  const current = readFavorites().map(normalizeFavorite);
  const exists = current.some((saved) => favoriteKey(saved) === key);
  const next = current.filter((saved) => favoriteKey(saved) !== key);
  if (!exists) next.unshift({ ...normalized, savedAt: new Date().toISOString() });
  writeFavorites(next);
  syncFavoriteButtons();
  renderFavoriteSection();
}

function normalizeButtonItem(button) {
  if (!button?._favoriteItem) return null;
  const normalized = normalizeFavorite(button._favoriteItem);
  button._favoriteItem = normalized;
  return normalized;
}

function syncFavoriteButtons() {
  $$(".journey-favorite-button, .tt-favorite-button").forEach((button) => {
    const item = normalizeButtonItem(button);
    if (!item) return;
    const saved = isFavorite(item);
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
    button.setAttribute("aria-label", saved ? "お気に入り便から外す" : "お気に入り便に追加");
    button.closest(".journey-card, .route-timetable-card")?.classList.toggle("is-favorite-trip", saved);
  });
}

function roundedRectPath(ctx, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(width - r, 0);
  ctx.quadraticCurveTo(width, 0, width, r);
  ctx.lineTo(width, height - r);
  ctx.quadraticCurveTo(width, height, width - r, height);
  ctx.lineTo(r, height);
  ctx.quadraticCurveTo(0, height, 0, height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
    if (image.complete && image.naturalWidth) resolve(image);
  });
}

async function rasterizeSpecToPng(spec) {
  const key = [spec.src, spec.width, spec.height, spec.radius, spec.scale].join("|");
  if (pngRasterCache.has(key)) return pngRasterCache.get(key);

  const promise = (async () => {
    const image = await loadImage(spec.src);
    const scale = Math.max(1, Number(spec.scale) || 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(spec.width * scale);
    canvas.height = Math.round(spec.height * scale);
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2D canvas is unavailable");

    const radius = spec.radius * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    roundedRectPath(ctx, canvas.width, canvas.height, radius);
    ctx.clip();
    ctx.fillStyle = spec.background || "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    return canvas.toDataURL("image/png");
  })();

  pngRasterCache.set(key, promise);
  return promise;
}

async function rasterizeAdSlot(slot) {
  if (!slot || slot.dataset.pngRasterized === "true" || slot.dataset.pngRasterizing === "true") return;
  const spec = AD_PNG_SPECS[slot.dataset.adSlot];
  const card = $(".house-ad-card", slot);
  const creative = $(".house-ad-creative", slot);
  const image = $(".house-ad-creative img", slot);
  if (!spec || !card || !creative || !image) return;

  slot.dataset.pngRasterizing = "true";
  card.classList.add("is-png-rasterizing");
  creative.style.setProperty("--house-ad-ratio", `${spec.width} / ${spec.height}`);
  image.setAttribute("width", String(spec.width));
  image.setAttribute("height", String(spec.height));

  try {
    const pngDataUrl = await rasterizeSpecToPng(spec);
    image.src = pngDataUrl;
    image.dataset.rasterFormat = "png";
    slot.dataset.pngRasterized = "true";
    card.classList.add("is-png-ready");
  } catch (error) {
    console.warn("House ad PNG rasterization failed", error);
    card.classList.add("is-png-fallback");
  } finally {
    delete slot.dataset.pngRasterizing;
    card.classList.remove("is-png-rasterizing");
  }
}

function patchAdCreatives() {
  $$("[data-ad-slot]").forEach((slot) => { void rasterizeAdSlot(slot); });
}

function settingsHeading() {
  return $("#view-settings > .page-heading");
}

function orderSettingsSections() {
  const heading = settingsHeading();
  const favorites = $("#favorite-trips-v6");
  const searches = $("#saved-searches-v6");
  if (!heading || !favorites) return;
  heading.insertAdjacentElement("afterend", favorites);
  if (searches) favorites.insertAdjacentElement("afterend", searches);
}

function renderFavoriteSection() {
  const section = $("#favorite-trips-v6");
  if (!section) return;
  const items = writeFavorites(readFavorites());
  section.innerHTML = `
    <div class="compact-settings-head">
      <div><h3>お気に入り便</h3><p>タップすると時刻表の該当便へ移動します</p></div>
      ${items.length ? '<button type="button" data-v7-clear-favorites>すべて削除</button>' : ""}
    </div>
    <div class="compact-saved-list">
      ${items.length ? items.map((item, index) => `
        <div class="compact-saved-row favorite-saved-row">
          <button type="button" class="compact-saved-open" data-v7-open-favorite="${index}">
            <span class="favorite-saved-star" aria-hidden="true">★</span>
            <span>
              <strong>${item.departure || "--:--"} → ${item.arrival || "--:--"} <em>${normalizeTripId(item.tripId)}便</em></strong>
              <small>${campusLabel(item.origin, item.originName)} → ${campusLabel(item.destination, item.destinationName)}・${item.routeType || "運行便"}</small>
            </span>
            <span aria-hidden="true">›</span>
          </button>
          <button type="button" class="compact-delete" data-v7-delete-favorite="${index}" aria-label="このお気に入り便を削除">×</button>
        </div>`).join("") : '<div class="compact-empty">時刻表や検索結果の★から追加できます。</div>'}
    </div>`;
  orderSettingsSections();
}

function timetableStickyInset() {
  const topbar = $(".topbar")?.offsetHeight || 0;
  const headerAd = $(".ad-slot-timetable-header")?.offsetHeight || 0;
  const controls = $("#timetable-route-controls")?.offsetHeight || 0;
  return topbar + headerAd + controls + 10;
}

function preciseFavoriteScroll(card, behavior = "auto") {
  if (!card || !document.documentElement.contains(card)) return Infinity;
  const currentTop = card.getBoundingClientRect().top;
  const desiredTop = timetableStickyInset();
  const delta = currentTop - desiredTop;
  if (Math.abs(delta) > 2) {
    window.scrollTo({
      top: Math.max(0, window.scrollY + delta),
      behavior
    });
  }
  return Math.abs(delta);
}

function flashFavoriteCard(card) {
  card.classList.remove("favorite-flash");
  requestAnimationFrame(() => card.classList.add("favorite-flash"));
  window.setTimeout(() => card.classList.remove("favorite-flash"), 1500);
}

function settleFavoritePosition(card) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    preciseFavoriteScroll(card, "smooth");
    [280, 520, 900].forEach((delay) => {
      window.setTimeout(() => {
        if (!$("#view-timetable")?.classList.contains("is-active")) return;
        preciseFavoriteScroll(card, "auto");
      }, delay);
    });
    flashFavoriteCard(card);
  }));
}

function focusFavoriteCard(item, attempt = 0) {
  const tripId = normalizeTripId(item.tripId);
  const card = $(`[data-tt-trip="${tripId}"]`);
  if (card) {
    settleFavoritePosition(card);
    return;
  }
  if (attempt < 10) {
    window.setTimeout(() => focusFavoriteCard(item, attempt + 1), 90 + attempt * 70);
  }
}

function openFavoriteInTimetable(rawItem) {
  const item = normalizeFavorite(rawItem);
  $('[data-nav="timetable"]')?.click();
  window.setTimeout(() => {
    $(`[data-tt-origin="${item.origin}"]`)?.click();
    window.setTimeout(() => {
      $(`[data-tt-destination="${item.destination}"]`)?.click();
      window.setTimeout(() => {
        if (item.origin === "suita" && item.originStop && $("#tt-suita-stop")) {
          $("#tt-suita-stop").value = item.originStop;
          $("#tt-suita-stop").dispatchEvent(new Event("change", { bubbles: true }));
        }
        focusFavoriteCard(item);
      }, 110);
    }, 80);
  }, 50);
}

function bindCaptureHandlers() {
  document.addEventListener("click", (event) => {
    const star = event.target.closest?.(".journey-favorite-button, .tt-favorite-button");
    if (star) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const item = normalizeButtonItem(star);
      if (item) toggleFavorite(item);
      return;
    }

    const open = event.target.closest?.("[data-v7-open-favorite]");
    if (open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const item = readFavorites()[Number(open.dataset.v7OpenFavorite)];
      if (item) openFavoriteInTimetable(item);
      return;
    }

    const remove = event.target.closest?.("[data-v7-delete-favorite]");
    if (remove) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const items = readFavorites();
      items.splice(Number(remove.dataset.v7DeleteFavorite), 1);
      writeFavorites(items);
      syncFavoriteButtons();
      renderFavoriteSection();
      return;
    }

    if (event.target.closest?.("[data-v7-clear-favorites]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      localStorage.setItem(FAVORITES_KEY, "[]");
      syncFavoriteButtons();
      renderFavoriteSection();
      return;
    }

    const nav = event.target.closest?.('[data-nav="settings"]');
    if (nav) window.setTimeout(() => { renderFavoriteSection(); orderSettingsSections(); }, 40);
  }, true);
}

function observeDynamicUI() {
  const targets = [$("#search-results"), $("#timetable-list"), $("#view-timetable"), $("#view-home")].filter(Boolean);
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchAdCreatives();
      syncFavoriteButtons();
    });
  });
  targets.forEach((target) => observer.observe(target, { childList: true, subtree: true }));
}

function init() {
  document.body.classList.add("ui-v7");
  installStyles();
  migrateFavorites();
  bindCaptureHandlers();
  observeDynamicUI();
  patchAdCreatives();
  syncFavoriteButtons();
  renderFavoriteSection();
  orderSettingsSections();
  window.setTimeout(() => { patchAdCreatives(); syncFavoriteButtons(); renderFavoriteSection(); orderSettingsSections(); }, 250);
  window.setTimeout(() => { patchAdCreatives(); syncFavoriteButtons(); }, 800);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
