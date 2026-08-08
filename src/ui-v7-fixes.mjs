const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const FAVORITES_KEY = "ou-bus:favorite-trips";
const CAMPUS_LABELS = Object.freeze({ suita: "吹田", toyonaka: "豊中", minoh: "箕面" });

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

function patchAdCreatives() {
  const compact = "./assets/ads/house/v3/house-compact-fullbleed-640x89.svg";
  const inline = "./assets/ads/house/v3/house-inline-fullbleed-640x180.svg";
  $$("[data-ad-slot]").forEach((slot) => {
    const placement = slot.dataset.adSlot;
    const img = $(".house-ad-creative img", slot);
    if (!img) return;
    const wanted = placement === "search-inline"
      ? inline
      : ["home-feed", "timetable-header", "timetable-inline"].includes(placement)
        ? compact
        : null;
    if (!wanted) return;
    if (!img.getAttribute("src")?.includes(wanted.split("/").at(-1))) img.setAttribute("src", wanted);
  });
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

function focusFavoriteCard(item, attempt = 0) {
  const tripId = normalizeTripId(item.tripId);
  const card = $(`[data-tt-trip="${tripId}"]`);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("favorite-flash");
    window.setTimeout(() => card.classList.remove("favorite-flash"), 1400);
    return;
  }
  if (attempt < 5) window.setTimeout(() => focusFavoriteCard(item, attempt + 1), 120 + attempt * 80);
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
      }, 90);
    }, 70);
  }, 40);
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
