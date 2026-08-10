import { CAMPUSES, STOPS } from "../data/timetable-2026.mjs";
import { describeJourney, searchJourneys, toDateKey } from "./search-engine.mjs";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const KEYS = Object.freeze({
  defaultCampus: "ou-bus:default-campus",
  currentSuitaStop: "ou-bus:suita-origin-stop",
  preferredSuitaOrigin: "ou-bus:preferred-suita-origin-stop",
  preferredSuitaDestination: "ou-bus:preferred-suita-destination-stop",
  lastDestination: "ou-bus:last-destination-campus"
});
const VALID_CAMPUSES = new Set(["suita", "toyonaka", "minoh"]);
const VALID_SUITA_ORIGINS = new Set(["suita_engineering", "suita_human_sciences"]);
const VALID_SUITA_DESTINATIONS = new Set(["suita_convention", "suita_engineering"]);
const FAVORITE_SUBTITLE = "タップすると保存した便を開きます";
const INSTALL_GUIDE_SOURCES = Object.freeze([
  "./assets/help/install/ios-01-share.webp",
  "./assets/help/install/ios-02-add-home.webp",
  "./assets/help/install/ios-03-confirm.webp"
]);
const ICONS = Object.freeze({
  refresh: '<path d="M20 6v5h-5"/><path d="M20 11a8 8 0 1 0-2.35 5.66"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  sliders: '<path d="M4 7h6M14 7h6M4 12h3M11 12h9M4 17h9M17 17h3"/><circle cx="12" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>',
  swap: '<path d="M8 4v16M8 4 5 7M8 4l3 3M16 20V4m0 16-3-3m3 3 3-3"/>',
  chevronDown: '<path d="m7 10 5 5 5-5"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>'
});

let navResizeObserver = null;
let surfaceResizeObserver = null;
let nativeDialogClose = null;
let pendingTimetableChange = false;
let pendingSearchModeChange = false;
let favoriteObserver = null;

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

function installStyles() {
  if ($('link[data-ui-current]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-current.css";
  link.dataset.uiCurrent = "true";
  document.head.append(link);
}

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function iconSvg(name) {
  return `<svg class="v11-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.chevronRight}</svg>`;
}

function setIcon(node, name) {
  if (!node || node.dataset.currentIcon === name) return;
  node.innerHTML = iconSvg(name);
  node.dataset.currentIcon = name;
}

function normalizeUtilityUi() {
  setIcon($("#refresh-button"), "refresh");
  setIcon($("#swap-button"), "swap");
  setIcon($("#home-origin-button .chevron"), "chevronDown");
  setIcon($(".search-timing-button .search-summary-icon"), "clock");
  setIcon($(".search-condition-button .search-summary-icon"), "sliders");
  $$(".search-summary-chevron").forEach((node) => setIcon(node, "chevronRight"));
  $$(".tt-compact-chevron").forEach((node) => setIcon(node, "chevronRight"));
  $$(".compact-saved-open > span[aria-hidden='true']:last-child").forEach((node) => setIcon(node, "chevronRight"));

  const save = $("#favorite-current-button");
  if (save) {
    const text = save.textContent.trim();
    const wanted = /保存済み/.test(text) ? "保存済み" : "条件を保存";
    if (text !== wanted) save.textContent = wanted;
  }
  $$(".tt-next-mini").forEach((node) => {
    if (node.textContent.trim() !== "次の便") node.textContent = "次の便";
    node.setAttribute("aria-label", "現在時刻から次に乗れる便");
  });

  const previous = $('[data-result-step="-1"]');
  const next = $('[data-result-step="1"]');
  if (previous && previous.textContent.trim() !== "‹  前の便") previous.textContent = "‹  前の便";
  if (next && next.textContent.trim() !== "次の便  ›") next.textContent = "次の便  ›";

  $$(".install-guide-media img").forEach((img, index) => {
    const media = img.closest(".install-guide-media");
    const src = INSTALL_GUIDE_SOURCES[index];
    if (src && !img.getAttribute("src")?.includes(src.replace("./", ""))) img.src = src;
    if (!media) return;
    const assess = () => {
      if (!img.naturalWidth) return;
      media.classList.toggle("is-low-res-source-v15", img.naturalWidth < 360);
    };
    if (img.complete) assess();
    if (img.dataset.currentResolutionBound !== "true") {
      img.dataset.currentResolutionBound = "true";
      img.addEventListener("load", assess, { passive: true });
    }
  });
}

function currentCampus() {
  const value = storageGet(KEYS.defaultCampus) || $("#default-campus")?.value;
  return VALID_CAMPUSES.has(value) ? value : "suita";
}

function preferredSuitaOrigin() {
  const preferred = storageGet(KEYS.preferredSuitaOrigin);
  if (VALID_SUITA_ORIGINS.has(preferred)) return preferred;
  const current = storageGet(KEYS.currentSuitaStop);
  return VALID_SUITA_ORIGINS.has(current) ? current : "suita_engineering";
}

function preferredSuitaDestination() {
  const value = storageGet(KEYS.preferredSuitaDestination);
  return VALID_SUITA_DESTINATIONS.has(value) ? value : "suita_engineering";
}

function destinationFor(origin) {
  const active = $("#home-destination-chips [data-home-destination].is-active")?.dataset.homeDestination;
  if (VALID_CAMPUSES.has(active) && active !== origin) return active;
  const cached = storageGet(KEYS.lastDestination);
  if (VALID_CAMPUSES.has(cached) && cached !== origin) return cached;
  return origin === "suita" ? "toyonaka" : "suita";
}

function homeStopKey(campus, role) {
  if (campus !== "suita") return campus;
  return role === "destination" ? preferredSuitaDestination() : preferredSuitaOrigin();
}

function endpointLabel(campus, stopKey, { long = false } = {}) {
  if (campus === "suita") return `吹田・${STOPS[stopKey]?.shortName || "工学部前"}`;
  return long ? (CAMPUSES[campus]?.longName || campus) : (CAMPUSES[campus]?.name || campus);
}

function nowParts() {
  const now = new Date();
  return {
    date: toDateKey(now),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  };
}

function dateLabel(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${month}/${day}(${weekday})`;
}

function routeTypeLabel(journey) {
  return journey?.isViaMinoh ? "箕面経由" : "直行";
}

function countdownLabel(journey) {
  const now = new Date();
  const delta = Math.round((journey.departureDateTime - now) / 60000);
  if (toDateKey(now) !== journey.serviceDate) return `${dateLabel(journey.serviceDate)}運行`;
  if (delta <= 0) return "まもなく出発";
  return delta === 1 ? "あと1分" : `あと${delta}分`;
}

function homeJourneyCard(journey, highlighted = false) {
  const description = describeJourney(journey);
  return `
    <article class="journey-card ${highlighted ? "is-highlighted" : ""}">
      <div class="journey-route">
        <span>${description.originName}</span><span class="arrow">→</span><span>${description.destinationName}</span>
      </div>
      <div class="journey-time"><strong>${journey.departureTime} → ${journey.arrivalTime}</strong><small>${journey.durationMinutes}分</small></div>
      <div class="journey-details">
        <span class="pill ${journey.isViaMinoh ? "pill-warning" : "pill-soft"}">${routeTypeLabel(journey)}</span>
        <span class="pill pill-soft">${journey.tripId}便</span>
        <span class="journey-date">${dateLabel(journey.serviceDate)}</span>
      </div>
    </article>`;
}

function normalizeHomeButtons(origin, destination) {
  const track = $("#home-destination-chips");
  if (!track) return;
  const options = Object.values(CAMPUSES).filter((campus) => campus.id !== origin);
  const signature = options.map((campus) => campus.id).join("|");
  const currentSignature = $$("[data-home-destination]", track).map((button) => button.dataset.homeDestination).join("|");

  if (currentSignature !== signature) {
    track.innerHTML = options.map((campus) => `<button class="chip" type="button" data-home-destination="${campus.id}">${campus.name}</button>`).join("");
  }

  $$("[data-home-destination]", track).forEach((button) => {
    const campus = CAMPUSES[button.dataset.homeDestination];
    if (campus && button.textContent.trim() !== campus.name) button.textContent = campus.name;
    const active = button.dataset.homeDestination === destination;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderCurrentHome(requestedDestination = null) {
  const originCampus = currentCampus();
  let destinationCampus = requestedDestination || destinationFor(originCampus);
  if (!VALID_CAMPUSES.has(destinationCampus) || destinationCampus === originCampus) {
    destinationCampus = originCampus === "suita" ? "toyonaka" : "suita";
  }
  storageSet(KEYS.lastDestination, destinationCampus);
  normalizeHomeButtons(originCampus, destinationCampus);

  const origin = homeStopKey(originCampus, "origin");
  const destination = homeStopKey(destinationCampus, "destination");
  const now = nowParts();
  const result = searchJourneys({ origin, destination, date: now.date, time: now.time, mode: "depart", limit: 4 });
  const journey = result.journeys?.[0];
  const nextContent = $("#next-card-content");
  const routeType = $("#next-route-type");
  const upcoming = $("#upcoming-list");
  const homeLabel = $("#home-origin-label");

  if (homeLabel) homeLabel.textContent = endpointLabel(originCampus, origin, { long: true });

  if (nextContent && routeType) {
    nextContent.classList.remove("skeleton-block");
    if (!journey) {
      routeType.textContent = "便なし";
      nextContent.innerHTML = `<div class="next-route">条件に合う便がありません</div><p>行き先・時刻または吹田の停留所設定を確認してください。</p>`;
    } else {
      const description = describeJourney(journey);
      routeType.textContent = routeTypeLabel(journey);
      nextContent.innerHTML = `
        <div class="next-route"><span>${endpointLabel(originCampus, origin)}</span><span class="arrow">→</span><span>${endpointLabel(destinationCampus, destination)}</span></div>
        <div class="next-times"><span>${journey.departureTime}</span><small>発</small><span class="slash">/</span><span>${journey.arrivalTime}</span><small>着</small></div>
        <div class="next-meta"><span>${countdownLabel(journey)}</span><span>${description.durationLabel}</span><span>${STOPS[journey.originStopId]?.shortName || "乗り場"}から</span></div>`;
    }
  }

  if (upcoming) {
    upcoming.innerHTML = result.journeys?.length
      ? result.journeys.slice(0, 3).map((item, index) => homeJourneyCard(item, index === 0)).join("")
      : `<div class="empty-state">この条件で利用できる便はありません。</div>`;
  }

  updateHomeGlider();
  normalizeUtilityUi();
}

function setGeometryVars(root, prefix, button) {
  if (!root || !button) return false;
  const rootRect = root.getBoundingClientRect();
  const rect = button.getBoundingClientRect();
  if (!rootRect.width || !rect.width) return false;
  root.style.setProperty(`--${prefix}-x`, `${rect.left - rootRect.left}px`);
  root.style.setProperty(`--${prefix}-y`, `${rect.top - rootRect.top}px`);
  root.style.setProperty(`--${prefix}-w`, `${rect.width}px`);
  root.style.setProperty(`--${prefix}-h`, `${rect.height}px`);
  return true;
}

function updateHomeGlider() {
  const track = $("#home-destination-chips");
  const active = $("[data-home-destination].is-active", track);
  if (setGeometryVars(track, "current-choice", active)) track?.classList.add("current-choice-ready");
}

function updateSearchGlider() {
  const track = $(".search-mode");
  const active = $("[data-mode].is-active", track);
  if (setGeometryVars(track, "current-choice", active)) track?.classList.add("current-choice-ready");
}

function updateTimetableGliders() {
  const controls = $("#timetable-route-controls");
  if (!controls) return;
  const origin = $(".tt-campus-tabs [data-tt-origin].is-active", controls);
  const destination = $(".tt-destination-buttons [data-tt-destination].is-active", controls);
  const originReady = setGeometryVars(controls, "current-tt-origin", origin);
  const destinationReady = setGeometryVars(controls, "current-tt-destination", destination);
  controls.classList.toggle("current-tt-origin-ready", originReady);
  controls.classList.toggle("current-tt-destination-ready", destinationReady);
}

function ensureNavGlider() {
  const nav = $(".bottom-nav");
  if (!nav) return;
  let glider = $(".nav-glider-v15", nav);
  if (!glider) {
    glider = document.createElement("span");
    glider.className = "nav-glider-v15";
    glider.setAttribute("aria-hidden", "true");
    nav.prepend(glider);
  }
  updateNavGlider(nav);
  if (!navResizeObserver && typeof ResizeObserver !== "undefined") {
    navResizeObserver = new ResizeObserver(() => updateNavGlider(nav));
    navResizeObserver.observe(nav);
  }
}

function updateNavGlider(nav = $(".bottom-nav")) {
  if (!nav) return;
  const active = $("button.is-active", nav);
  if (!active) return;
  nav.style.setProperty("--v15-nav-glider-x", `${active.offsetLeft + 1}px`);
  nav.style.setProperty("--v15-nav-glider-width", `${Math.max(0, active.offsetWidth - 2)}px`);
  nav.classList.add("nav-glider-ready-v15");
}

function normalizeFavoritePresentation() {
  const section = $("#favorite-trips-v6");
  if (!section) return;
  const subtitle = $(".compact-settings-head p", section);
  if (subtitle && subtitle.textContent !== FAVORITE_SUBTITLE) subtitle.textContent = FAVORITE_SUBTITLE;
  $$(".favorite-saved-row em", section).forEach((node) => {
    const tripId = node.textContent.trim().replace(/便+$/u, "");
    const wanted = tripId ? `${tripId}便` : "";
    if (wanted && node.textContent !== wanted) node.textContent = wanted;
  });
}

function observeFavorites() {
  const section = $("#favorite-trips-v6");
  if (!section || favoriteObserver) return;
  let queued = false;
  favoriteObserver = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      normalizeFavoritePresentation();
      normalizeUtilityUi();
    });
  });
  favoriteObserver.observe(section, { childList: true, subtree: true, characterData: true });
}

function stopRedundantClick(event, selector) {
  if (!event.target.closest?.(selector)) return false;
  event.stopPropagation();
  return true;
}

function captureInteractions(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const activeNav = target.closest(".bottom-nav [data-nav].is-active");
  if (activeNav) {
    event.stopPropagation();
    return;
  }

  if (stopRedundantClick(event, "#home-destination-chips [data-home-destination].is-active")) return;
  if (stopRedundantClick(event, ".tt-campus-tabs [data-tt-origin].is-active")) return;
  if (stopRedundantClick(event, ".tt-destination-buttons [data-tt-destination].is-active")) return;
  if (stopRedundantClick(event, ".search-mode [data-mode].is-active")) return;

  const homeDestination = target.closest("#home-destination-chips [data-home-destination]");
  if (homeDestination) {
    event.stopPropagation();
    renderCurrentHome(homeDestination.dataset.homeDestination || null);
    return;
  }

  if (target.closest(".tt-campus-tabs [data-tt-origin], .tt-destination-buttons [data-tt-destination]")) pendingTimetableChange = true;
  if (target.closest(".search-mode [data-mode]")) pendingSearchModeChange = true;
}

function afterInteractions(event) {
  const target = event.target instanceof Element ? event.target : null;

  if (pendingTimetableChange) {
    pendingTimetableChange = false;
    queueMicrotask(() => {
      updateTimetableGliders();
      normalizeUtilityUi();
    });
  }
  if (pendingSearchModeChange) {
    pendingSearchModeChange = false;
    queueMicrotask(updateSearchGlider);
  }
  if (!target) return;

  const nav = target.closest(".bottom-nav [data-nav]");
  if (nav) {
    requestAnimationFrame(() => {
      updateNavGlider();
      normalizeUtilityUi();
      const view = nav.dataset.nav;
      if (view) window.dispatchEvent(new CustomEvent("handai:viewchange", { detail: { view } }));
    });
  }
}

function bindStateChanges() {
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches("#default-campus, #default-suita-stop, #default-suita-arrival-stop")) {
      queueMicrotask(() => renderCurrentHome());
    }
  });
}

function bindBrandHome() {
  const mark = $(".topbar .brand-mark");
  if (!mark || mark.dataset.currentHomeBound === "true") return;
  mark.dataset.currentHomeBound = "true";
  mark.setAttribute("role", "button");
  mark.setAttribute("tabindex", "0");
  mark.setAttribute("aria-label", "ホームへ戻る");
  const goHome = () => {
    const home = $('.bottom-nav [data-nav="home"]');
    if (home?.classList.contains("is-active")) window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    else home?.click();
  };
  mark.addEventListener("click", goHome);
  mark.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    goHome();
  });
}

function installDialogMotion() {
  if (nativeDialogClose || typeof HTMLDialogElement === "undefined") return;
  nativeDialogClose = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.close = function currentClose(returnValue) {
    if (!this.open || reducedMotion()) return nativeDialogClose.call(this, returnValue);
    if (this.classList.contains("current-closing")) return;
    this.classList.add("current-closing");
    window.setTimeout(() => {
      nativeDialogClose.call(this, returnValue);
      this.classList.remove("current-closing");
    }, 220);
  };
}

function observeSurfaces() {
  const home = $("#home-destination-chips");
  const timetable = $("#timetable-route-controls");
  const search = $(".search-mode");
  if (home) new MutationObserver(() => queueMicrotask(updateHomeGlider)).observe(home, { childList: true });
  if (timetable) new MutationObserver(() => queueMicrotask(() => { updateTimetableGliders(); normalizeUtilityUi(); })).observe(timetable, { childList: true });
  if (search) new MutationObserver(() => queueMicrotask(updateSearchGlider)).observe(search, { childList: true });

  if (typeof ResizeObserver !== "undefined") {
    surfaceResizeObserver = new ResizeObserver(() => {
      updateHomeGlider();
      updateSearchGlider();
      updateTimetableGliders();
    });
    [home, timetable, search].filter(Boolean).forEach((node) => surfaceResizeObserver.observe(node));
  }
}

function init() {
  document.body.classList.add("ui-v11", "ui-v14", "ui-v15", "ui-current");
  installStyles();
  installDialogMotion();
  bindBrandHome();
  observeFavorites();
  normalizeFavoritePresentation();
  normalizeUtilityUi();
  ensureNavGlider();
  observeSurfaces();
  window.__handaiCurrentRenderHome = () => renderCurrentHome();
  window.addEventListener("click", captureInteractions, true);
  document.addEventListener("click", afterInteractions);
  bindStateChanges();
  renderCurrentHome();
  updateHomeGlider();
  updateSearchGlider();
  updateTimetableGliders();
  window.addEventListener("resize", () => {
    updateNavGlider();
    updateHomeGlider();
    updateSearchGlider();
    updateTimetableGliders();
  }, { passive: true });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
