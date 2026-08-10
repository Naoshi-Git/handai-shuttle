import { CAMPUSES, STOPS } from "../data/timetable-2026.mjs";
import { describeJourney, searchJourneys, toDateKey } from "./search-engine.mjs";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const KEYS = Object.freeze({
  currentCampus: "ou-bus:default-campus",
  currentSuitaStop: "ou-bus:suita-origin-stop",
  preferredSuitaOrigin: "ou-bus:preferred-suita-origin-stop",
  preferredSuitaDestination: "ou-bus:preferred-suita-destination-stop",
  lastDestination: "ou-bus:last-destination-campus"
});

const VALID_CAMPUSES = new Set(["suita", "toyonaka", "minoh"]);
const VALID_SUITA_ORIGINS = new Set(["suita_engineering", "suita_human_sciences"]);
const VALID_SUITA_DESTINATIONS = new Set(["suita_convention", "suita_engineering"]);

function currentCampus() {
  const value = localStorage.getItem(KEYS.currentCampus);
  return VALID_CAMPUSES.has(value) ? value : "suita";
}

function preferredSuitaOrigin() {
  const value = localStorage.getItem(KEYS.preferredSuitaOrigin);
  if (VALID_SUITA_ORIGINS.has(value)) return value;
  const legacy = localStorage.getItem(KEYS.currentSuitaStop);
  const fallback = VALID_SUITA_ORIGINS.has(legacy) ? legacy : "suita_engineering";
  localStorage.setItem(KEYS.preferredSuitaOrigin, fallback);
  return fallback;
}

function preferredSuitaDestination() {
  const value = localStorage.getItem(KEYS.preferredSuitaDestination);
  const fallback = VALID_SUITA_DESTINATIONS.has(value) ? value : "suita_engineering";
  if (value !== fallback) localStorage.setItem(KEYS.preferredSuitaDestination, fallback);
  return fallback;
}

function effectiveSuitaOrigin() {
  const detected = localStorage.getItem(KEYS.currentSuitaStop);
  const locationState = $("#locate-button")?.dataset.locationState || "";
  if (currentCampus() === "suita" && ["matched", "manual"].includes(locationState) && VALID_SUITA_ORIGINS.has(detected)) {
    return detected;
  }
  return preferredSuitaOrigin();
}

function fallbackDestination(origin) {
  return origin === "suita" ? "toyonaka" : "suita";
}

function cachedDestination(origin) {
  const cached = localStorage.getItem(KEYS.lastDestination);
  return VALID_CAMPUSES.has(cached) && cached !== origin ? cached : fallbackDestination(origin);
}

function saveDestination(value) {
  if (VALID_CAMPUSES.has(value)) localStorage.setItem(KEYS.lastDestination, value);
}

function campusStopKey(campus, role = "origin") {
  if (campus !== "suita") return campus;
  return role === "destination" ? preferredSuitaDestination() : effectiveSuitaOrigin();
}

function endpointLabel(campus, stopKey) {
  if (campus !== "suita") return CAMPUSES[campus]?.name || campus;
  return `吹田・${STOPS[stopKey]?.shortName || "工学部前"}`;
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
  return journey.isViaMinoh ? "箕面経由" : "直行";
}

function countdownLabel(journey) {
  const now = new Date();
  const delta = Math.round((journey.departureDateTime - now) / 60000);
  if (toDateKey(now) !== journey.serviceDate) return `${dateLabel(journey.serviceDate)}運行`;
  if (delta <= 0) return "まもなく出発";
  return delta === 1 ? "あと1分" : `あと${delta}分`;
}

function homeDestinationCampus() {
  const active = $("#home-destination-chips [data-home-destination].is-active")?.dataset.homeDestination;
  const origin = currentCampus();
  return VALID_CAMPUSES.has(active) && active !== origin ? active : cachedDestination(origin);
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

function renderPreciseHome() {
  if (!$("#view-home")) return;
  const originCampus = currentCampus();
  const destinationCampus = homeDestinationCampus();
  const origin = campusStopKey(originCampus, "origin");
  const destination = campusStopKey(destinationCampus, "destination");
  const now = nowParts();
  const result = searchJourneys({ origin, destination, date: now.date, time: now.time, mode: "depart", limit: 4 });
  const journey = result.journeys?.[0];
  const nextContent = $("#next-card-content");
  const routeType = $("#next-route-type");
  const upcoming = $("#upcoming-list");
  const homeLabel = $("#home-origin-label");

  if (homeLabel) {
    homeLabel.textContent = originCampus === "suita"
      ? endpointLabel(originCampus, origin)
      : CAMPUSES[originCampus]?.longName || "現在地";
  }

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
        <div class="next-meta"><span>${countdownLabel(journey)}</span><span>${description.durationLabel}</span><span>${STOPS[journey.originStopId].shortName}から</span></div>`;
    }
  }

  if (upcoming) {
    upcoming.innerHTML = result.journeys?.length
      ? result.journeys.slice(0, 3).map((item, index) => homeJourneyCard(item, index === 0)).join("")
      : `<div class="empty-state">この条件で利用できる便はありません。</div>`;
  }

  const suitaChip = $('#home-destination-chips [data-home-destination="suita"]');
  if (suitaChip) suitaChip.textContent = `吹田・${STOPS[preferredSuitaDestination()].shortName}`;
}

function setSelectValue(select, value) {
  if (!select || select.value === value) return;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function syncSearchDefaults() {
  const originCampus = currentCampus();
  const destinationCampus = cachedDestination(originCampus);
  setSelectValue($("#origin-campus"), originCampus);
  setSelectValue($("#destination-campus"), destinationCampus);
  if (originCampus === "suita") setSelectValue($("#origin-stop"), effectiveSuitaOrigin());
  if (destinationCampus === "suita") setSelectValue($("#destination-stop"), preferredSuitaDestination());
}

function ensureSuitaPreferencesCard() {
  const defaultCampus = $("#default-campus");
  const fallbackCard = defaultCampus?.closest(".settings-card");
  const originWrap = $("#default-suita-stop-wrap");
  if (!fallbackCard || !originWrap) return;

  const heading = $("h3", fallbackCard);
  const campusCaption = $("label.input-field > span", fallbackCard);
  if (heading) heading.textContent = "位置情報が使えないとき";
  if (campusCaption) campusCaption.textContent = "初期キャンパス";

  let card = $("#suita-stop-preferences-v9");
  if (!card) {
    card = document.createElement("section");
    card.id = "suita-stop-preferences-v9";
    card.className = "settings-card suitastop-settings-v9";
    card.innerHTML = `
      <div class="v9-settings-copy"><h3>よく使う吹田のバス停</h3><p>吹田発と吹田着で停留所が異なるため、別々に設定します。</p></div>
      <div id="suita-origin-preference-slot"></div>
      <label class="input-field"><span>吹田に着くとき</span><select id="default-suita-arrival-stop"><option value="suita_engineering">工学部前</option><option value="suita_convention">コンベンション前</option></select></label>
      <p class="v9-settings-note">人間科学部前は吹田発の乗車停留所です。吹田着はコンベンション前／工学部前から選択します。</p>`;
    fallbackCard.insertAdjacentElement("afterend", card);
  }

  const slot = $("#suita-origin-preference-slot", card);
  if (slot && originWrap.parentElement !== slot) slot.append(originWrap);
  const originCaption = $("span", originWrap);
  if (originCaption) originCaption.textContent = "吹田から乗るとき";
  originWrap.classList.remove("is-hidden");

  const originSelect = $("#default-suita-stop");
  const arrivalSelect = $("#default-suita-arrival-stop");
  if (originSelect) originSelect.value = preferredSuitaOrigin();
  if (arrivalSelect) arrivalSelect.value = preferredSuitaDestination();
}

function bindSuitaPreferences() {
  const origin = $("#default-suita-stop");
  const arrival = $("#default-suita-arrival-stop");
  if (origin && origin.dataset.routeStateBound !== "true") {
    origin.dataset.routeStateBound = "true";
    origin.addEventListener("change", () => {
      if (!VALID_SUITA_ORIGINS.has(origin.value)) return;
      localStorage.setItem(KEYS.preferredSuitaOrigin, origin.value);
      if (currentCampus() !== "suita" || !["matched", "manual"].includes($("#locate-button")?.dataset.locationState || "")) {
        localStorage.setItem(KEYS.currentSuitaStop, origin.value);
      }
      renderPreciseHome();
    });
  }
  if (arrival && arrival.dataset.routeStateBound !== "true") {
    arrival.dataset.routeStateBound = "true";
    arrival.addEventListener("change", () => {
      if (!VALID_SUITA_DESTINATIONS.has(arrival.value)) return;
      localStorage.setItem(KEYS.preferredSuitaDestination, arrival.value);
      if ($("#destination-campus")?.value === "suita") setSelectValue($("#destination-stop"), arrival.value);
      renderPreciseHome();
    });
  }
}

function normalizeLocateButton() {
  const button = $("#locate-button");
  if (!button) return;
  const text = button.textContent.trim();
  let state = button.dataset.locationState || "idle";
  let label = "現在地";

  if (/測位|推定中/.test(text)) {
    state = "loading";
    label = "測位中";
  } else if (/^現在地:/.test(text)) {
    state = "matched";
    label = "認識済み";
    button.title = text.replace(/^現在地:\s*/, "現在地：");
    button.setAttribute("aria-label", button.title);
  } else if (/^手動選択:/.test(text)) {
    state = "manual";
    label = "設定済み";
    button.title = text.replace(/^手動選択:\s*/, "現在地：");
    button.setAttribute("aria-label", button.title);
  } else if (/取得できません|非対応/.test(text) || !$("#location-assist")?.classList.contains("is-hidden")) {
    state = "failed";
    label = "要確認";
    button.title = "現在地を自動判定できません。タップして再試行できます。";
    button.setAttribute("aria-label", button.title);
  } else if (state === "matched") label = "認識済み";
  else if (state === "manual") label = "設定済み";
  else if (state === "failed") label = "要確認";

  button.dataset.locationState = state;
  if (button.textContent !== label) button.textContent = label;
  renderPreciseHome();
}

function bindRouteState() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest?.("button, [data-home-destination]");
    if (!target) return;

    if (target.matches("[data-home-destination]")) {
      saveDestination(target.dataset.homeDestination);
      renderPreciseHome();
      return;
    }

    if (target.matches('[data-nav="search"], #search-now-button, #arrival-search-button, #open-search-button')) {
      syncSearchDefaults();
      return;
    }

    if (target.matches("[data-campus-choice], #refresh-button")) {
      const active = $("#home-destination-chips [data-home-destination].is-active")?.dataset.homeDestination;
      if (active) saveDestination(active);
      renderPreciseHome();
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.matches("#destination-campus")) {
      saveDestination(target.value);
      if (target.value === "suita") setSelectValue($("#destination-stop"), preferredSuitaDestination());
    }
    if (target.matches("#default-campus")) {
      const active = $("#home-destination-chips [data-home-destination].is-active")?.dataset.homeDestination;
      if (active) saveDestination(active);
      renderPreciseHome();
    }
  });
}

function observeLocationButton() {
  const button = $("#locate-button");
  const assist = $("#location-assist");
  if (!button) return;
  let queued = false;
  const normalize = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      normalizeLocateButton();
    });
  };
  const observer = new MutationObserver(normalize);
  observer.observe(button, { childList: true, characterData: true, subtree: true });
  if (assist) observer.observe(assist, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  normalizeLocateButton();
}

function init() {
  document.body.classList.add("ui-v9");
  preferredSuitaOrigin();
  preferredSuitaDestination();
  ensureSuitaPreferencesCard();
  bindSuitaPreferences();
  bindRouteState();
  observeLocationButton();

  const origin = currentCampus();
  const desired = cachedDestination(origin);
  const chip = $(`#home-destination-chips [data-home-destination="${desired}"]`);
  if (chip && !chip.classList.contains("is-active")) chip.click();
  else renderPreciseHome();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
