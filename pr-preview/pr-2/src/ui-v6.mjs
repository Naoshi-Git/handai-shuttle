const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE = Object.freeze({
  savedSearches: "ou-bus:saved-searches",
  legacySavedRoutes: "ou-bus:saved-routes",
  favoriteTrips: "ou-bus:favorite-trips"
});

const CAMPUS_LABELS = Object.freeze({ suita: "吹田", toyonaka: "豊中", minoh: "箕面" });
const STOP_LABELS = Object.freeze({
  suita_engineering: "工学部前",
  suita_human_sciences: "人間科学部前",
  suita_convention: "コンベンション前"
});

function safeParse(value, fallback = []) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function loadList(key) { return safeParse(localStorage.getItem(key), []); }
function saveList(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function migrateLegacySavedRoutes() {
  if (loadList(STORAGE.savedSearches).length) return;
  const legacy = loadList(STORAGE.legacySavedRoutes);
  if (!legacy.length) return;
  const migrated = legacy.map((route) => ({
    origin: route.origin,
    destination: route.destination,
    directOnly: Boolean(route.directOnly),
    roundTrip: false,
    stayMinutes: 60,
    mode: "depart",
    originStop: route.origin === "suita" ? "suita_engineering" : "",
    destinationStop: route.destination === "suita" ? "suita_engineering" : "",
    savedAt: route.savedAt || new Date().toISOString()
  }));
  saveList(STORAGE.savedSearches, migrated.slice(0, 12));
}

function currentMode() {
  return $('[data-mode].is-active')?.dataset.mode || "depart";
}

function captureSearchCondition() {
  const origin = $("#origin-campus")?.value || "suita";
  const destination = $("#destination-campus")?.value || "toyonaka";
  return {
    origin,
    destination,
    originStop: origin === "suita" ? ($("#origin-stop")?.value || "suita_engineering") : "",
    destinationStop: destination === "suita" ? ($("#destination-stop")?.value || "suita_engineering") : "",
    directOnly: Boolean($("#direct-only")?.checked),
    roundTrip: Boolean($("#round-trip")?.checked),
    stayMinutes: Number($("#stay-minutes")?.value || 60),
    mode: currentMode(),
    savedAt: new Date().toISOString()
  };
}

function searchIdentity(search) {
  return [
    search.origin,
    search.destination,
    search.originStop || "",
    search.destinationStop || "",
    Boolean(search.directOnly),
    Boolean(search.roundTrip),
    Number(search.stayMinutes || 60),
    search.mode || "depart"
  ].join("|");
}

function saveCurrentSearchCondition() {
  const next = captureSearchCondition();
  const saved = loadList(STORAGE.savedSearches).filter((item) => searchIdentity(item) !== searchIdentity(next));
  saved.unshift(next);
  saveList(STORAGE.savedSearches, saved.slice(0, 12));
  renderSettingsCollections();
  const button = $("#favorite-current-button");
  if (button) {
    button.textContent = "✓ 条件保存済み";
    window.setTimeout(() => { button.textContent = "☆ 条件を保存"; }, 1500);
  }
}

function nowParts() {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  };
}

function applySearchCondition(search, { date = null, time = null, submit = false } = {}) {
  $('[data-nav="search"]')?.click();
  window.setTimeout(() => {
    const origin = $("#origin-campus");
    const destination = $("#destination-campus");
    if (!origin || !destination) return;
    origin.value = search.origin || "suita";
    origin.dispatchEvent(new Event("change", { bubbles: true }));
    destination.value = search.destination || "toyonaka";
    destination.dispatchEvent(new Event("change", { bubbles: true }));

    if (search.origin === "suita" && $("#origin-stop")) $("#origin-stop").value = search.originStop || "suita_engineering";
    if (search.destination === "suita" && $("#destination-stop")) $("#destination-stop").value = search.destinationStop || "suita_engineering";

    if ($("#direct-only")) $("#direct-only").checked = Boolean(search.directOnly);
    if ($("#round-trip")) {
      $("#round-trip").checked = Boolean(search.roundTrip);
      $("#round-trip").dispatchEvent(new Event("change", { bubbles: true }));
    }
    if ($("#stay-minutes")) {
      const value = String(search.stayMinutes || 60);
      const option = [...$("#stay-minutes").options].find((item) => item.value === value);
      if (option) $("#stay-minutes").value = value;
    }
    $(`[data-mode="${search.mode || "depart"}"]`)?.click();

    const current = nowParts();
    if ($("#search-date")) {
      $("#search-date").value = date || current.date;
      $("#search-date").dispatchEvent(new Event("change", { bubbles: true }));
    }
    if ($("#search-time")) {
      $("#search-time").value = time || current.time;
      $("#search-time").dispatchEvent(new Event("change", { bubbles: true }));
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    if (submit) window.setTimeout(() => $("#search-form")?.requestSubmit(), 40);
  }, 30);
}

function campusLabel(id) { return CAMPUS_LABELS[id] || id || "キャンパス"; }
function stopLabel(id) { return STOP_LABELS[id] || ""; }

function savedSearchMeta(search) {
  const items = [];
  if (search.origin === "suita" && search.originStop) items.push(stopLabel(search.originStop));
  if (search.destination === "suita" && search.destinationStop) items.push(stopLabel(search.destinationStop));
  items.push(search.directOnly ? "直行" : "全便");
  if (search.roundTrip) items.push(`往復・${search.stayMinutes || 60}分`);
  items.push(search.mode === "arrive" ? "到着指定" : "出発指定");
  return items.filter(Boolean).join("・");
}

function starMarkup() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="star-shape" d="M12 3.6 14.6 8.9l5.8.84-4.2 4.1.99 5.78L12 16.9l-5.19 2.72.99-5.78-4.2-4.1 5.8-.84L12 3.6Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
}

function timePair(text = "") {
  const matches = text.match(/\d{1,2}:\d{2}/g);
  return matches?.length >= 2 ? matches.slice(0, 2) : null;
}

function routeNames(card) {
  return $$(".journey-route > span:not(.arrow)", card).map((node) => node.textContent.trim()).filter(Boolean);
}

function currentSearchContext() {
  return {
    origin: $("#origin-campus")?.value || "suita",
    destination: $("#destination-campus")?.value || "toyonaka",
    originStop: $("#origin-stop")?.value || "",
    destinationStop: $("#destination-stop")?.value || "",
    directOnly: Boolean($("#direct-only")?.checked),
    roundTrip: Boolean($("#round-trip")?.checked),
    stayMinutes: Number($("#stay-minutes")?.value || 60),
    mode: currentMode()
  };
}

function normalizeTripId(value = "") {
  return String(value || "").trim().replace(/便$/, "");
}

function favoriteIdentity(item) {
  return [normalizeTripId(item?.tripId), item?.departure || "", item?.arrival || ""].join("|");
}

function migrateFavoriteTrips() {
  const current = loadList(STORAGE.favoriteTrips);
  if (!current.length) return;
  const normalized = [];
  const seen = new Set();
  let changed = false;
  current.forEach((item) => {
    const next = { ...item, tripId: normalizeTripId(item?.tripId) };
    if (next.tripId !== item?.tripId) changed = true;
    const key = favoriteIdentity(next);
    if (!next.tripId || seen.has(key)) {
      changed = true;
      return;
    }
    seen.add(key);
    normalized.push(next);
  });
  if (changed) saveList(STORAGE.favoriteTrips, normalized.slice(0, 30));
}

function favoriteFromJourneyCard(card) {
  const pair = timePair($(".journey-time strong", card)?.textContent || "");
  const names = routeNames(card);
  const tripLabel = $$(".journey-details .pill", card).map((node) => node.textContent.trim()).find((value) => /^[EW]\d+便$/.test(value)) || "";
  const tripId = normalizeTripId(tripLabel);
  if (!pair || !tripId) return null;
  const routeType = $$(".journey-details .pill", card).map((node) => node.textContent.trim()).find((value) => value === "直行" || value === "箕面経由") || "運行便";
  const context = currentSearchContext();
  return {
    source: "search",
    tripId,
    departure: pair[0],
    arrival: pair[1],
    originName: names[0] || campusLabel(context.origin),
    destinationName: names.at(-1) || campusLabel(context.destination),
    routeType,
    date: $("#search-date")?.value || nowParts().date,
    ...context,
    savedAt: new Date().toISOString()
  };
}

function favoriteFromTimetableCard(card) {
  const pair = timePair($(".tt-compact-time", card)?.textContent || "");
  const tripId = normalizeTripId(card.dataset.ttTrip || "");
  if (!pair || !tripId) return null;
  const origin = $('[data-tt-origin].is-active')?.dataset.ttOrigin || "suita";
  const destination = $('[data-tt-destination].is-active')?.dataset.ttDestination || "toyonaka";
  const routeType = $(".tt-compact-badges .pill", card)?.textContent?.trim() || "運行便";
  return {
    source: "timetable",
    tripId,
    departure: pair[0],
    arrival: pair[1],
    originName: campusLabel(origin),
    destinationName: campusLabel(destination),
    routeType,
    origin,
    destination,
    originStop: origin === "suita" ? ($("#tt-suita-stop")?.value || "suita_engineering") : "",
    destinationStop: "",
    directOnly: routeType === "直行",
    roundTrip: false,
    stayMinutes: 60,
    mode: "depart",
    date: nowParts().date,
    savedAt: new Date().toISOString()
  };
}

function isFavorite(item) {
  const key = favoriteIdentity(item);
  return loadList(STORAGE.favoriteTrips).some((saved) => favoriteIdentity(saved) === key);
}

function setFavorite(item, shouldSave) {
  const normalizedItem = { ...item, tripId: normalizeTripId(item?.tripId) };
  const key = favoriteIdentity(normalizedItem);
  let list = loadList(STORAGE.favoriteTrips).filter((saved) => favoriteIdentity(saved) !== key);
  if (shouldSave) list.unshift({ ...normalizedItem, savedAt: new Date().toISOString() });
  saveList(STORAGE.favoriteTrips, list.slice(0, 30));
  syncFavoriteControls();
  renderSettingsCollections();
}

function favoriteButton(item, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.innerHTML = starMarkup();
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = !isFavorite(item);
    setFavorite(item, next);
  });
  button._favoriteItem = { ...item, tripId: normalizeTripId(item?.tripId) };
  return button;
}

function syncFavoriteButton(button) {
  const item = button._favoriteItem;
  if (!item) return;
  const saved = isFavorite(item);
  button.classList.toggle("is-saved", saved);
  button.setAttribute("aria-pressed", String(saved));
  button.setAttribute("aria-label", saved ? "お気に入り便から外す" : "お気に入り便に追加");
}

function decorateJourneyFavorites() {
  $$("#search-results .journey-card:not(.round-card)").forEach((card) => {
    if (card.querySelector(".journey-favorite-button")) return;
    const item = favoriteFromJourneyCard(card);
    if (!item) return;
    card.classList.add("has-favorite-control");
    const button = favoriteButton(item, "journey-favorite-button");
    card.append(button);
    syncFavoriteButton(button);
  });
}

function decorateTimetableFavorites() {
  $$("#timetable-list [data-tt-trip][data-v4-compact='true']").forEach((card) => {
    if (card.querySelector(".tt-favorite-button")) return;
    const row = $(".tt-compact-row", card);
    const chevron = $(".tt-compact-chevron", row);
    const item = favoriteFromTimetableCard(card);
    if (!row || !item) return;
    const button = favoriteButton(item, "tt-favorite-button");
    if (chevron) row.insertBefore(button, chevron);
    else row.append(button);
    syncFavoriteButton(button);
  });
}

function syncFavoriteControls() {
  $$(".journey-favorite-button, .tt-favorite-button").forEach((button) => {
    syncFavoriteButton(button);
    button.closest(".journey-card, .route-timetable-card")?.classList.toggle("is-favorite-trip", button.classList.contains("is-saved"));
  });
}

function savedSearchSection() {
  let section = $("#saved-searches-v6");
  if (section) return section;
  const source = $("#view-settings .source-card");
  if (!source) return null;
  section = document.createElement("section");
  section.id = "saved-searches-v6";
  section.className = "settings-card compact-saved-card";
  source.before(section);
  return section;
}

function favoriteTripsSection() {
  let section = $("#favorite-trips-v6");
  if (section) return section;
  const source = $("#view-settings .source-card");
  if (!source) return null;
  section = document.createElement("section");
  section.id = "favorite-trips-v6";
  section.className = "settings-card compact-saved-card";
  source.before(section);
  return section;
}

function renderSavedSearches() {
  const section = savedSearchSection();
  if (!section) return;
  const items = loadList(STORAGE.savedSearches);
  section.innerHTML = `
    <div class="compact-settings-head"><div><h3>保存した検索条件</h3><p>区間・直行/往復などを再利用</p></div>${items.length ? '<button type="button" data-clear-searches>すべて削除</button>' : ""}</div>
    <div class="compact-saved-list">${items.length ? items.map((item, index) => `
      <div class="compact-saved-row">
        <button type="button" class="compact-saved-open" data-open-search-save="${index}">
          <span><strong>${campusLabel(item.origin)} → ${campusLabel(item.destination)}</strong><small>${savedSearchMeta(item)}</small></span><span aria-hidden="true">›</span>
        </button>
        <button type="button" class="compact-delete" data-delete-search-save="${index}" aria-label="この検索条件を削除">×</button>
      </div>`).join("") : '<div class="compact-empty">まだ保存されていません。</div>'}</div>`;
  $$('[data-open-search-save]', section).forEach((button) => button.addEventListener("click", () => applySearchCondition(items[Number(button.dataset.openSearchSave)] || {})));
  $$('[data-delete-search-save]', section).forEach((button) => button.addEventListener("click", () => {
    const next = loadList(STORAGE.savedSearches);
    next.splice(Number(button.dataset.deleteSearchSave), 1);
    saveList(STORAGE.savedSearches, next);
    renderSavedSearches();
  }));
  $("[data-clear-searches]", section)?.addEventListener("click", () => { saveList(STORAGE.savedSearches, []); renderSavedSearches(); });
}

function openFavorite(item) {
  const tripId = normalizeTripId(item?.tripId);
  if (!tripId || !item?.origin || !item?.destination) {
    applySearchCondition(item || {}, { date: item?.date || nowParts().date, time: item?.departure || nowParts().time, submit: true });
    return;
  }

  $('[data-nav="timetable"]')?.click();
  window.setTimeout(() => {
    $(`[data-tt-origin="${item.origin}"]`)?.click();
    window.setTimeout(() => {
      $(`[data-tt-destination="${item.destination}"]`)?.click();
      if (item.origin === "suita" && $("#tt-suita-stop") && item.originStop) {
        $("#tt-suita-stop").value = item.originStop;
        $("#tt-suita-stop").dispatchEvent(new Event("change", { bubbles: true }));
      }
      window.setTimeout(() => {
        const card = $(`[data-tt-trip="${tripId}"]`);
        if (!card) return;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => card.click(), 180);
      }, 260);
    }, 100);
  }, 60);
}

function renderFavoriteTrips() {
  const section = favoriteTripsSection();
  if (!section) return;
  const items = loadList(STORAGE.favoriteTrips);
  section.innerHTML = `
    <div class="compact-settings-head"><div><h3>お気に入り便</h3><p>特定の便を★で保存</p></div>${items.length ? '<button type="button" data-clear-favorites>すべて削除</button>' : ""}</div>
    <div class="compact-saved-list">${items.length ? items.map((item, index) => `
      <div class="compact-saved-row favorite-saved-row">
        <button type="button" class="compact-saved-open" data-open-favorite="${index}">
          <span class="favorite-saved-star" aria-hidden="true">★</span>
          <span><strong>${item.departure} → ${item.arrival} <em>${normalizeTripId(item.tripId)}便</em></strong><small>${item.originName} → ${item.destinationName}・${item.routeType}</small></span><span aria-hidden="true">›</span>
        </button>
        <button type="button" class="compact-delete" data-delete-favorite="${index}" aria-label="このお気に入り便を削除">×</button>
      </div>`).join("") : '<div class="compact-empty">時刻表や検索結果の★から追加できます。</div>'}</div>`;
  $$('[data-open-favorite]', section).forEach((button) => button.addEventListener("click", () => openFavorite(items[Number(button.dataset.openFavorite)] || {})));
  $$('[data-delete-favorite]', section).forEach((button) => button.addEventListener("click", () => {
    const next = loadList(STORAGE.favoriteTrips);
    next.splice(Number(button.dataset.deleteFavorite), 1);
    saveList(STORAGE.favoriteTrips, next);
    renderFavoriteTrips();
    syncFavoriteControls();
  }));
  $("[data-clear-favorites]", section)?.addEventListener("click", () => { saveList(STORAGE.favoriteTrips, []); renderFavoriteTrips(); syncFavoriteControls(); });
}

function renderSettingsCollections() {
  renderSavedSearches();
  renderFavoriteTrips();
}

function setupSaveSemantics() {
  migrateLegacySavedRoutes();
  migrateFavoriteTrips();
  const legacyCard = $("#saved-routes")?.closest(".settings-card");
  legacyCard?.classList.add("legacy-saved-routes-card");
  const button = $("#favorite-current-button");
  if (button && button.dataset.v6Save !== "true") {
    button.dataset.v6Save = "true";
    button.textContent = "☆ 条件を保存";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      saveCurrentSearchCondition();
    }, true);
  }
  $('[data-nav="settings"]')?.addEventListener("click", () => window.setTimeout(renderSettingsCollections, 0));
  renderSettingsCollections();
}

function navIcon(name) {
  const icons = {
    home: '<path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4v-9.5Z"/>',
    search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
    timetable: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3.5 2"/>',
    settings: '<path d="M4 7h7M15 7h5M4 12h3M11 12h9M4 17h9M17 17h3"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>'
  };
  return `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.home}</svg>`;
}

function installBottomNavIcons() {
  const labels = { home: "ホーム", search: "ルート検索", timetable: "時刻表", settings: "設定" };
  $$(".bottom-nav [data-nav]").forEach((button) => {
    const name = button.dataset.nav;
    if (button.dataset.v6Icon === "true") return;
    button.dataset.v6Icon = "true";
    button.innerHTML = `${navIcon(name)}<span class="nav-label">${labels[name] || name}</span>`;
  });
}

function portalBottomNav() {
  const nav = $(".bottom-nav");
  if (!nav || nav.parentElement === document.body) return;
  document.body.append(nav);
}

function resetScrollOnViewEntry() {
  let previous = $(".view.is-active")?.dataset.view || "home";
  const root = $(".app-shell");
  if (!root) return;
  const observer = new MutationObserver(() => {
    const next = $(".view.is-active")?.dataset.view || "home";
    if (next === previous) return;
    previous = next;
    window.scrollTo({ top: 0, behavior: "auto" });
    if (next === "search") {
      window.setTimeout(() => {
        if ($(".view.is-active")?.dataset.view === "search") window.scrollTo({ top: 0, behavior: "auto" });
      }, 150);
    }
  });
  $$(".view", root).forEach((view) => observer.observe(view, { attributes: true, attributeFilter: ["class"] }));
}

function syncDynamicPolish() {
  decorateJourneyFavorites();
  decorateTimetableFavorites();
  syncFavoriteControls();
  installBottomNavIcons();
}

function observeDynamicPolish() {
  const targets = [$("#search-results"), $("#timetable-list")].filter(Boolean);
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncDynamicPolish();
    });
  });
  targets.forEach((target) => observer.observe(target, { childList: true, subtree: true }));
}

function init() {
  portalBottomNav();
  setupSaveSemantics();
  installBottomNavIcons();
  resetScrollOnViewEntry();
  observeDynamicPolish();
  syncDynamicPolish();
  window.setTimeout(syncDynamicPolish, 250);
  window.setTimeout(syncDynamicPolish, 800);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
