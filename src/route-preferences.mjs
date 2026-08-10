const $ = (selector, root = document) => root.querySelector(selector);

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

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

function currentCampus() {
  const value = storageGet(KEYS.currentCampus);
  return VALID_CAMPUSES.has(value) ? value : "suita";
}

function preferredSuitaOrigin() {
  const preferred = storageGet(KEYS.preferredSuitaOrigin);
  if (VALID_SUITA_ORIGINS.has(preferred)) return preferred;
  const legacy = storageGet(KEYS.currentSuitaStop);
  const value = VALID_SUITA_ORIGINS.has(legacy) ? legacy : "suita_engineering";
  storageSet(KEYS.preferredSuitaOrigin, value);
  return value;
}

function preferredSuitaDestination() {
  const value = storageGet(KEYS.preferredSuitaDestination);
  const next = VALID_SUITA_DESTINATIONS.has(value) ? value : "suita_engineering";
  if (value !== next) storageSet(KEYS.preferredSuitaDestination, next);
  return next;
}

function cachedDestination(origin = currentCampus()) {
  const cached = storageGet(KEYS.lastDestination);
  if (VALID_CAMPUSES.has(cached) && cached !== origin) return cached;
  return origin === "suita" ? "toyonaka" : "suita";
}

function setSelectValue(select, value) {
  if (!select || select.value === value) return;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
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

  let card = $("#suita-stop-preferences-current");
  if (!card) {
    card = document.createElement("section");
    card.id = "suita-stop-preferences-current";
    card.className = "settings-card suitastop-settings-current";
    card.innerHTML = `
      <div class="current-settings-copy"><h3>よく使う吹田のバス停</h3><p>吹田発と吹田着で停留所が異なるため、別々に設定します。</p></div>
      <div id="suita-origin-preference-current"></div>
      <label class="input-field"><span>吹田に着くとき</span><select id="default-suita-arrival-stop"><option value="suita_engineering">工学部前</option><option value="suita_convention">コンベンション前</option></select></label>
      <p class="current-settings-note">人間科学部前は吹田発の乗車停留所です。吹田着はコンベンション前／工学部前から選択します。</p>`;
    fallbackCard.insertAdjacentElement("afterend", card);
  }

  const slot = $("#suita-origin-preference-current", card);
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
  if (origin && origin.dataset.currentPrefsBound !== "true") {
    origin.dataset.currentPrefsBound = "true";
    origin.addEventListener("change", () => {
      if (!VALID_SUITA_ORIGINS.has(origin.value)) return;
      storageSet(KEYS.preferredSuitaOrigin, origin.value);
      storageSet(KEYS.currentSuitaStop, origin.value);
      if ($("#origin-campus")?.value === "suita") setSelectValue($("#origin-stop"), origin.value);
    });
  }
  if (arrival && arrival.dataset.currentPrefsBound !== "true") {
    arrival.dataset.currentPrefsBound = "true";
    arrival.addEventListener("change", () => {
      if (!VALID_SUITA_DESTINATIONS.has(arrival.value)) return;
      storageSet(KEYS.preferredSuitaDestination, arrival.value);
      if ($("#destination-campus")?.value === "suita") setSelectValue($("#destination-stop"), arrival.value);
    });
  }
}

function syncSearchDefaults() {
  const origin = currentCampus();
  const destination = cachedDestination(origin);
  setSelectValue($("#origin-campus"), origin);
  setSelectValue($("#destination-campus"), destination);
  if (origin === "suita") setSelectValue($("#origin-stop"), preferredSuitaOrigin());
  if (destination === "suita") setSelectValue($("#destination-stop"), preferredSuitaDestination());
}

function syncTimetableDefaults() {
  const origin = currentCampus();
  const destination = cachedDestination(origin);
  const originButton = $(`[data-tt-origin="${origin}"]`);
  if (originButton && !originButton.classList.contains("is-active")) originButton.click();
  requestAnimationFrame(() => {
    const destinationButton = $(`[data-tt-destination="${destination}"]`);
    if (destinationButton && !destinationButton.classList.contains("is-active")) destinationButton.click();
    if (origin === "suita") setSelectValue($("#tt-suita-stop"), preferredSuitaOrigin());
  });
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
  }

  button.dataset.locationState = state;
  if (button.textContent.trim() !== label) button.textContent = label;
}

function observeLocationButton() {
  const button = $("#locate-button");
  if (!button) return;
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      normalizeLocateButton();
    });
  });
  observer.observe(button, { childList: true, characterData: true, subtree: true });
  normalizeLocateButton();
}

function bindRoutePersistence() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const home = target.closest("[data-home-destination]");
    if (home?.dataset.homeDestination) storageSet(KEYS.lastDestination, home.dataset.homeDestination);
    const timetable = target.closest("[data-tt-destination]");
    if (timetable?.dataset.ttDestination) storageSet(KEYS.lastDestination, timetable.dataset.ttDestination);
  });
  $("#destination-campus")?.addEventListener("change", (event) => {
    if (VALID_CAMPUSES.has(event.target.value)) storageSet(KEYS.lastDestination, event.target.value);
  });
}

function bindViewDefaults() {
  window.addEventListener("handai:viewchange", (event) => {
    const view = event.detail?.view;
    if (view === "search") requestAnimationFrame(syncSearchDefaults);
    if (view === "timetable") requestAnimationFrame(syncTimetableDefaults);
  });
}

function init() {
  preferredSuitaOrigin();
  preferredSuitaDestination();
  ensureSuitaPreferencesCard();
  bindSuitaPreferences();
  bindRoutePersistence();
  bindViewDefaults();
  observeLocationButton();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
