import { crowdingBadgeText, predictCrowding } from "./crowding-prediction.mjs";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function installStyles() {
  if ($('link[data-ui-v4]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./ui-v4.css";
  link.dataset.uiV4 = "true";
  document.head.append(link);
}

function timePair(text = "") {
  const matches = text.match(/\d{1,2}:\d{2}/g);
  return matches?.length >= 2 ? matches.slice(0, 2) : null;
}

function crowdingBadge(prediction, { compact = false } = {}) {
  const text = compact
    ? `Lv${prediction.level} ${prediction.label}`
    : crowdingBadgeText(prediction);
  return `<span class="crowding-badge crowding-lv${prediction.level}" data-crowding-badge="true" title="${prediction.reason}" aria-label="${crowdingBadgeText(prediction)}">${text}</span>`;
}

function removeFeaturedDuplicate() {
  const featured = timePair($("#next-card-content .next-times")?.textContent || "");
  const upcoming = $("#upcoming-list");
  const first = upcoming?.querySelector(".journey-card");
  if (!featured || !first) return;
  const firstPair = timePair(first.querySelector(".journey-time strong")?.textContent || "");
  if (!firstPair || firstPair.join("|") !== featured.join("|")) return;
  first.remove();
  if (!upcoming.querySelector(".journey-card")) {
    upcoming.innerHTML = '<div class="empty-state">次の便以降に表示できる便はありません。</div>';
  }
}

function decorateNextCardCrowding() {
  const meta = $("#next-card-content .next-meta");
  const pair = timePair($("#next-card-content .next-times")?.textContent || "");
  if (!meta || !pair || meta.querySelector("[data-crowding-badge]")) return;
  const prediction = predictCrowding({ departureTime: pair[0], arrivalTime: pair[1] });
  const wrap = document.createElement("span");
  wrap.innerHTML = crowdingBadge(prediction);
  meta.append(...wrap.childNodes);
}

function decorateJourneyCrowding(card) {
  if (card.dataset.crowdingDecorated === "true") return;
  const pair = timePair(card.querySelector(".journey-time strong")?.textContent || "");
  const details = card.querySelector(".journey-details");
  if (!pair || !details) return;
  const prediction = predictCrowding({ departureTime: pair[0], arrivalTime: pair[1] });
  details.insertAdjacentHTML("beforeend", crowdingBadge(prediction));
  card.dataset.crowdingDecorated = "true";
}

function decorateRoundLegCrowding(leg) {
  if (leg.dataset.crowdingDecorated === "true") return;
  const pair = timePair(leg.querySelector(".journey-time strong")?.textContent || "");
  if (!pair) return;
  const prediction = predictCrowding({ departureTime: pair[0], arrivalTime: pair[1] });
  leg.insertAdjacentHTML("beforeend", `<div class="crowding-round-row">${crowdingBadge(prediction)}</div>`);
  leg.dataset.crowdingDecorated = "true";
}

function decorateCrowdingSurfaces() {
  decorateNextCardCrowding();
  $$("#upcoming-list .journey-card, #search-results .journey-card").forEach(decorateJourneyCrowding);
  $$("#search-results .round-leg").forEach(decorateRoundLegCrowding);
}

function observeDynamicSurfaces() {
  const targets = [$("#upcoming-list"), $("#next-card-content"), $("#search-results")].filter(Boolean);
  if (!targets.length) return;
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      removeFeaturedDuplicate();
      decorateCrowdingSurfaces();
    });
  });
  targets.forEach((target) => observer.observe(target, { childList: true, subtree: true, characterData: true }));
  removeFeaturedDuplicate();
  decorateCrowdingSurfaces();
}

const timetableDetails = new Map();

function ensureDetailSheet() {
  let dialog = $("#tt-detail-sheet");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "tt-detail-sheet";
  dialog.className = "tt-detail-sheet";
  dialog.innerHTML = `
    <div class="tt-sheet-shell">
      <div class="tt-sheet-handle" aria-hidden="true"></div>
      <header class="tt-sheet-head">
        <div class="tt-sheet-title-wrap">
          <span class="tt-sheet-kicker">運行詳細</span>
          <h3 id="tt-sheet-title"></h3>
          <p id="tt-sheet-caption"></p>
        </div>
        <button type="button" class="tt-sheet-close" aria-label="詳細を閉じる">×</button>
      </header>
      <div class="tt-sheet-meta">
        <span id="tt-sheet-route-type" class="pill pill-soft"></span>
        <span id="tt-sheet-crowding"></span>
        <span id="tt-sheet-next" class="tt-sheet-next is-hidden">現在時刻から次の便</span>
      </div>
      <p id="tt-sheet-crowding-reason" class="tt-sheet-crowding-reason"></p>
      <div class="tt-sheet-stops" id="tt-sheet-stops"></div>
    </div>`;
  document.body.append(dialog);
  $(".tt-sheet-close", dialog)?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  return dialog;
}

function openDetail(tripId) {
  const detail = timetableDetails.get(tripId);
  if (!detail) return;
  const dialog = ensureDetailSheet();
  $("#tt-sheet-title", dialog).textContent = `${detail.departure} → ${detail.arrival}`;
  $("#tt-sheet-caption", dialog).textContent = detail.caption;
  const routeType = $("#tt-sheet-route-type", dialog);
  routeType.textContent = detail.routeType;
  routeType.className = `pill ${detail.via ? "pill-warning" : "pill-soft"}`;
  $("#tt-sheet-crowding", dialog).innerHTML = crowdingBadge(detail.crowding);
  $("#tt-sheet-crowding-reason", dialog).textContent = `${detail.crowding.reason}。時間割からの推定です。`;
  $("#tt-sheet-next", dialog)?.classList.toggle("is-hidden", !detail.isNext);
  $("#tt-sheet-stops", dialog).innerHTML = detail.stops.map((stop, index) => `
    <div class="tt-sheet-stop ${index === 0 ? "is-origin" : ""} ${index === detail.stops.length - 1 ? "is-destination" : ""}">
      <span class="tt-sheet-line" aria-hidden="true"></span>
      <span class="tt-sheet-dot" aria-hidden="true"></span>
      <span class="tt-sheet-stop-name">${stop.name}</span>
      <strong>${stop.time}</strong>
    </div>`).join("");
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function compactTimetableCard(card) {
  if (card.dataset.v4Compact === "true") return;
  const tripId = card.dataset.ttTrip;
  if (!tripId) return;
  const pair = timePair(card.querySelector(".timetable-card-head strong")?.textContent || "");
  if (!pair) return;
  const routePill = card.querySelector(".timetable-card-head .pill");
  const routeType = routePill?.textContent?.trim() || "運行便";
  const caption = card.querySelector(".tt-route-caption")?.textContent?.trim() || `${tripId}便`;
  const stops = $$(".stop-time", card).map((stop) => ({
    name: stop.querySelector("span")?.textContent?.trim() || "停留所",
    time: stop.querySelector("b")?.textContent?.trim() || "--:--"
  }));
  const crowding = predictCrowding({ departureTime: pair[0], arrivalTime: pair[1] });
  const detail = {
    tripId,
    departure: pair[0],
    arrival: pair[1],
    routeType,
    via: routePill?.classList.contains("pill-warning") || false,
    caption,
    stops,
    crowding,
    isNext: card.classList.contains("is-next")
  };
  timetableDetails.set(tripId, detail);
  card.dataset.v4Compact = "true";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `${pair[0]}発 ${pair[1]}着 ${routeType}。${crowdingBadgeText(crowding)}。タップして詳細を表示`);
  card.innerHTML = `
    <div class="tt-compact-row">
      <div class="tt-compact-time"><strong>${pair[0]}</strong><span>→</span><strong>${pair[1]}</strong></div>
      <div class="tt-compact-badges">
        <span class="pill ${detail.via ? "pill-warning" : "pill-soft"}">${routeType}</span>
        ${crowdingBadge(crowding, { compact: true })}
        ${detail.isNext ? '<span class="tt-next-mini">次の便</span>' : ""}
      </div>
      <span class="tt-compact-chevron" aria-hidden="true">›</span>
    </div>`;
  const activate = () => openDetail(tripId);
  card.addEventListener("click", activate);
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate();
  });
}

function compactTimetable() {
  $$("#timetable-list .route-timetable-card").forEach(compactTimetableCard);
}

function observeTimetable() {
  const list = $("#timetable-list");
  if (!list) return;
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      compactTimetable();
    });
  });
  observer.observe(list, { childList: true, subtree: true });
  compactTimetable();
}

function ensureCrowdingInfo() {
  if ($("#crowding-info-card")) return;
  const sourceCard = $(".source-card");
  if (!sourceCard) return;
  const section = document.createElement("section");
  section.id = "crowding-info-card";
  section.className = "settings-card crowding-info-card";
  section.innerHTML = `
    <h3>混雑予想について</h3>
    <p>2026年度の授業開始・終了時刻と各便の発着時刻から推定した目安です。乗車人数の実測、リアルタイム混雑、満席情報ではありません。</p>
    <div class="crowding-legend">
      ${[1, 2, 3, 4, 5].map((level) => {
        const prediction = { level, label: ["", "空きやすい", "混雑小", "やや混雑", "混雑", "かなり混雑"][level], reason: "" };
        return crowdingBadge(prediction, { compact: true });
      }).join("")}
    </div>`;
  sourceCard.before(section);
}

installStyles();
observeDynamicSurfaces();
observeTimetable();
ensureDetailSheet();
ensureCrowdingInfo();
