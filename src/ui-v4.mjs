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
  return matches?.length >= 2 ? matches.slice(0, 2).join("|") : null;
}

function removeFeaturedDuplicate() {
  const featuredPair = timePair($("#next-card-content .next-times")?.textContent || "");
  const upcoming = $("#upcoming-list");
  const first = upcoming?.querySelector(".journey-card");
  if (!featuredPair || !first) return;
  const firstPair = timePair(first.querySelector(".journey-time strong")?.textContent || "");
  if (firstPair !== featuredPair) return;
  first.remove();
  if (!upcoming.querySelector(".journey-card")) {
    upcoming.innerHTML = '<div class="empty-state">次の便以降に表示できる便はありません。</div>';
  }
}

function observeUpcoming() {
  const targets = [$("#upcoming-list"), $("#next-card-content")].filter(Boolean);
  if (!targets.length) return;
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      removeFeaturedDuplicate();
    });
  });
  targets.forEach((target) => observer.observe(target, { childList: true, subtree: true, characterData: true }));
  removeFeaturedDuplicate();
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
      <div class="tt-sheet-meta"><span id="tt-sheet-route-type" class="pill pill-soft"></span><span id="tt-sheet-next" class="tt-sheet-next is-hidden">現在時刻から次の便</span></div>
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
  const pair = (card.querySelector(".timetable-card-head strong")?.textContent || "").match(/\d{1,2}:\d{2}/g) || [];
  if (pair.length < 2) return;
  const routePill = card.querySelector(".timetable-card-head .pill");
  const routeType = routePill?.textContent?.trim() || "運行便";
  const caption = card.querySelector(".tt-route-caption")?.textContent?.trim() || `${tripId}便`;
  const stops = $$(".stop-time", card).map((stop) => ({
    name: stop.querySelector("span")?.textContent?.trim() || "停留所",
    time: stop.querySelector("b")?.textContent?.trim() || "--:--"
  }));
  const detail = {
    tripId,
    departure: pair[0],
    arrival: pair[1],
    routeType,
    via: routePill?.classList.contains("pill-warning") || false,
    caption,
    stops,
    isNext: card.classList.contains("is-next")
  };
  timetableDetails.set(tripId, detail);
  card.dataset.v4Compact = "true";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `${pair[0]}発 ${pair[1]}着 ${routeType}。タップして詳細を表示`);
  card.innerHTML = `
    <div class="tt-compact-row">
      <div class="tt-compact-time"><strong>${pair[0]}</strong><span>→</span><strong>${pair[1]}</strong></div>
      <div class="tt-compact-info">
        <div class="tt-compact-badges"><span class="pill ${detail.via ? "pill-warning" : "pill-soft"}">${routeType}</span>${detail.isNext ? '<span class="tt-next-mini">次の便</span>' : ""}</div>
        <span class="tt-compact-caption">${caption}</span>
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

installStyles();
observeUpcoming();
observeTimetable();
ensureDetailSheet();
