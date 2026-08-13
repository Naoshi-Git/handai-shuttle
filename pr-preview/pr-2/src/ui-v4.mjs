import { crowdingBadgeText, predictCrowding } from "./crowding-prediction.mjs";
import { openSharePreview } from "./share-card.mjs?share-card-polish-20260813";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function timePair(text = "") {
  const matches = text.match(/\d{1,2}:\d{2}/g);
  return matches?.length >= 2 ? matches.slice(0, 2) : null;
}

function crowdingIcon(prediction, { legend = false } = {}) {
  const people = Array.from({ length: 5 }, (_, index) =>
    `<span class="crowding-person ${index < prediction.level ? "is-active" : ""}" aria-hidden="true"></span>`
  ).join("");
  return `<span class="crowding-icon crowding-lv${prediction.level} ${legend ? "is-legend" : ""}" data-crowding-badge="true" data-crowding-level="${prediction.level}" role="img" title="${prediction.reason}" aria-label="${crowdingBadgeText(prediction)}">${people}</span>`;
}

function shareIconMarkup() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0-11 4 4m-4-4L8 7M5 11v8h14v-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function displayDateToday() {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date());
}

function routeNames(root) {
  return $$(".journey-route > span:not(.arrow)", root).map((node) => node.textContent.trim()).filter(Boolean);
}

function journeyShareData(card, sourceLabel = "検索結果") {
  const pair = timePair(card.querySelector(".journey-time strong")?.textContent || "");
  if (!pair) return null;
  const names = routeNames(card);
  const pills = $$(".journey-details .pill", card).map((node) => node.textContent.trim());
  const routeType = pills.find((value) => value === "直行" || value === "箕面経由") || "運行便";
  const tripId = pills.find((value) => /^[EW]\d+便$/.test(value)) || "";
  return {
    sourceLabel,
    origin: names[0] || "出発",
    destination: names.at(-1) || "到着",
    originDetail: names[0] || "",
    destinationDetail: names.at(-1) || "",
    departure: pair[0],
    arrival: pair[1],
    duration: card.querySelector(".journey-time small")?.textContent?.trim() || "",
    routeType,
    tripId,
    date: card.querySelector(".journey-date")?.textContent?.trim() || displayDateToday(),
    crowdingLevel: predictCrowding({ departureTime: pair[0], arrivalTime: pair[1] }).level
  };
}

function nextShareData() {
  const pair = timePair($("#next-card-content .next-times")?.textContent || "");
  if (!pair) return null;
  const names = $$("#next-card-content .next-route > span:not(.arrow)").map((node) => node.textContent.trim()).filter(Boolean);
  const meta = $$("#next-card-content .next-meta > span:not(.crowding-icon)").map((node) => node.textContent.trim());
  const metaRoute = meta.find((value) => value === "直行" || value === "箕面経由");
  const duration = meta.find((value) => /^\d+分$/.test(value)) || "";
  const originDetail = (meta.find((value) => /から$/.test(value)) || "").replace(/から$/, "");
  const topType = $("#next-route-type")?.textContent?.trim() || "";
  const prediction = predictCrowding({ departureTime: pair[0], arrivalTime: pair[1] });
  return {
    sourceLabel: "次の便",
    origin: names[0] || "出発",
    destination: names.at(-1) || "到着",
    originDetail,
    destinationDetail: names.at(-1) || "",
    departure: pair[0],
    arrival: pair[1],
    duration,
    routeType: metaRoute || (topType === "最終便" ? "運行便" : topType) || "運行便",
    date: displayDateToday(),
    crowdingLevel: prediction.level
  };
}

function compactNextMeta() {
  const meta = $("#next-card-content .next-meta");
  if (!meta) return;
  const topType = $("#next-route-type")?.textContent?.trim();
  if (topType === "直行" || topType === "箕面経由") {
    $$(':scope > span:not(.crowding-icon)', meta).forEach((node) => {
      if (node.textContent.trim() === topType) node.remove();
    });
  }
  meta.classList.add("next-meta-v4");
}

function ensureNextShareButton() {
  const top = $("#next-card .next-card-top");
  const routeType = $("#next-route-type");
  if (!top || !routeType) return;
  let group = $(".next-card-actions", top);
  if (!group) {
    group = document.createElement("div");
    group.className = "next-card-actions";
    routeType.before(group);
    group.append(routeType);
  }
  let button = $("#next-share-button");
  if (!button) {
    button = document.createElement("button");
    button.id = "next-share-button";
    button.className = "next-share-button";
    button.type = "button";
    button.setAttribute("aria-label", "次の便を共有");
    button.innerHTML = shareIconMarkup();
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const data = nextShareData();
      if (data) await openSharePreview(data);
    });
    group.append(button);
  }
  button.disabled = !nextShareData();
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
  wrap.innerHTML = crowdingIcon(prediction);
  meta.append(...wrap.childNodes);
}

function decorateJourneyCrowding(card) {
  if (card.dataset.crowdingDecorated === "true") return;
  const pair = timePair(card.querySelector(".journey-time strong")?.textContent || "");
  const details = card.querySelector(".journey-details");
  if (!pair || !details) return;
  const prediction = predictCrowding({ departureTime: pair[0], arrivalTime: pair[1] });
  details.insertAdjacentHTML("beforeend", crowdingIcon(prediction));
  card.dataset.crowdingDecorated = "true";
}

function decorateJourneyShare(card) {
  if (card.querySelector(".journey-share-button")) return;
  const sourceLabel = card.closest("#upcoming-list") ? "このあとの便" : "検索結果";
  const data = journeyShareData(card, sourceLabel);
  if (!data) return;
  card.classList.add("journey-card-shareable");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "journey-share-button";
  button.setAttribute("aria-label", "この便を共有");
  button.innerHTML = shareIconMarkup();
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const latest = journeyShareData(card, sourceLabel);
    if (latest) await openSharePreview(latest);
  });
  card.append(button);
}

function decorateRoundLegCrowding(leg) {
  if (leg.dataset.crowdingDecorated === "true") return;
  const pair = timePair(leg.querySelector(".journey-time strong")?.textContent || "");
  if (!pair) return;
  const prediction = predictCrowding({ departureTime: pair[0], arrivalTime: pair[1] });
  leg.insertAdjacentHTML("beforeend", `<div class="crowding-round-row">${crowdingIcon(prediction)}</div>`);
  leg.dataset.crowdingDecorated = "true";
}

function decorateCrowdingSurfaces() {
  decorateNextCardCrowding();
  $$("#upcoming-list .journey-card, #search-results .journey-card").forEach((card) => {
    decorateJourneyCrowding(card);
    decorateJourneyShare(card);
  });
  $$("#search-results .round-leg").forEach(decorateRoundLegCrowding);
  compactNextMeta();
  ensureNextShareButton();
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

function timetableShareData(detail) {
  return {
    sourceLabel: "時刻表",
    origin: detail.stops[0]?.name || "出発",
    destination: detail.stops.at(-1)?.name || "到着",
    originDetail: detail.stops[0]?.name || "",
    destinationDetail: detail.stops.at(-1)?.name || "",
    departure: detail.departure,
    arrival: detail.arrival,
    routeType: detail.routeType,
    tripId: detail.tripId,
    date: "2026年度 通常ダイヤ",
    crowdingLevel: detail.crowding.level
  };
}

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
        <div class="tt-sheet-head-actions">
          <button type="button" class="tt-sheet-share" aria-label="この便を共有">${shareIconMarkup()}</button>
          <button type="button" class="tt-sheet-close" aria-label="詳細を閉じる">×</button>
        </div>
      </header>
      <div class="tt-sheet-meta">
        <span id="tt-sheet-route-type" class="pill pill-soft"></span>
        <span id="tt-sheet-crowding"></span>
        <span id="tt-sheet-next" class="tt-sheet-next is-hidden">次の便</span>
      </div>
      <p id="tt-sheet-crowding-reason" class="tt-sheet-crowding-reason"></p>
      <div class="tt-sheet-stops" id="tt-sheet-stops"></div>
    </div>`;
  document.body.append(dialog);
  $(".tt-sheet-close", dialog)?.addEventListener("click", () => dialog.close());
  $(".tt-sheet-share", dialog)?.addEventListener("click", async () => {
    const detail = timetableDetails.get(dialog.dataset.tripId);
    if (detail) await openSharePreview(timetableShareData(detail));
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  return dialog;
}

function openDetail(tripId) {
  const detail = timetableDetails.get(tripId);
  if (!detail) return;
  const dialog = ensureDetailSheet();
  dialog.dataset.tripId = tripId;
  $("#tt-sheet-title", dialog).textContent = `${detail.departure} → ${detail.arrival}`;
  $("#tt-sheet-caption", dialog).textContent = detail.caption;
  const routeType = $("#tt-sheet-route-type", dialog);
  routeType.textContent = detail.routeType;
  routeType.className = `pill ${detail.via ? "pill-warning" : "pill-soft"}`;
  $("#tt-sheet-crowding", dialog).innerHTML = crowdingIcon(detail.crowding);
  $("#tt-sheet-crowding-reason", dialog).textContent = `${detail.crowding.reason}（時間割ベースの推定）`;
  $("#tt-sheet-next", dialog)?.classList.toggle("is-hidden", !detail.isNext);
  $("#tt-sheet-stops", dialog).innerHTML = detail.stops.map((stop, index) => `
    <div class="tt-sheet-stop ${index === 0 ? "is-origin" : ""} ${index === detail.stops.length - 1 ? "is-destination" : ""}">
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
        ${crowdingIcon(crowding)}
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
  const labels = ["", "空きやすい", "混雑小", "やや混雑", "混雑", "かなり混雑"];
  const section = document.createElement("section");
  section.id = "crowding-info-card";
  section.className = "settings-card crowding-info-card";
  section.innerHTML = `
    <h3>混雑予想について</h3>
    <p>1〜5限の開始・終了時刻と各便の発着時刻から推定した目安です。5限終了後は、その日の最後の移動ラッシュとして強めに評価します。実測人数・リアルタイム混雑・満席情報ではありません。</p>
    <div class="crowding-legend">
      ${[1, 2, 3, 4, 5].map((level) => {
        const prediction = { level, label: labels[level], reason: "" };
        return `<div class="crowding-legend-item">${crowdingIcon(prediction, { legend: true })}<span>Lv${level} ${labels[level]}</span></div>`;
      }).join("")}
    </div>`;
  sourceCard.before(section);
}

observeDynamicSurfaces();
observeTimetable();
ensureDetailSheet();
ensureCrowdingInfo();
