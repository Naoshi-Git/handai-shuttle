const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const HEADER_COPY = Object.freeze({
  home: "阪大シャトル",
  search: "ルート検索",
  timetable: "時刻表",
  settings: "設定"
});

let serviceBannerAnchor = null;
const surfaceObservers = [];

function installStyles() {
  if ($('link[data-ui-v5]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./ui-v5.css";
  link.dataset.uiV5 = "true";
  document.head.append(link);
}

function activeView() {
  return $(".view.is-active")?.dataset.view || "home";
}

function ensureServiceBannerAnchor() {
  const banner = $("#service-banner");
  if (!banner || serviceBannerAnchor) return;
  serviceBannerAnchor = document.createComment("service-banner-anchor");
  banner.before(serviceBannerAnchor);
}

function restoreServiceBanner() {
  const banner = $("#service-banner");
  if (!banner || !serviceBannerAnchor?.parentNode) return;
  if (serviceBannerAnchor.nextSibling !== banner) {
    serviceBannerAnchor.parentNode.insertBefore(banner, serviceBannerAnchor.nextSibling);
  }
  banner.classList.remove("is-search-context");
}

function moveServiceBannerToSearch() {
  const banner = $("#service-banner");
  const submit = $("#search-form .search-submit");
  if (!banner || !submit) return;
  if (banner.previousElementSibling !== submit) submit.insertAdjacentElement("afterend", banner);
  banner.classList.add("is-search-context");
}

function syncHeader() {
  const view = activeView();
  const titleCopy = HEADER_COPY[view] || HEADER_COPY.home;
  const title = $(".topbar .brand-copy h1");
  if (title && title.textContent !== titleCopy) title.textContent = titleCopy;
  document.body.dataset.activeView = view;

  if (view === "search") moveServiceBannerToSearch();
  else restoreServiceBanner();

  syncStickyMetrics();
}

function syncStickyMetrics() {
  const topbar = $(".topbar");
  if (topbar) {
    document.documentElement.style.setProperty("--app-topbar-height", `${Math.ceil(topbar.getBoundingClientRect().height)}px`);
  }
  const stickyAd = $('[data-ad-slot="timetable-header"]');
  const adHeight = stickyAd ? Math.ceil(stickyAd.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty("--tt-sticky-ad-height", `${adHeight}px`);
}

function formatCompactDate(dateValue) {
  if (!dateValue) return "日付";
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${month}/${day}(${weekday})`;
}

function isNearNow(dateValue, timeValue) {
  if (!dateValue || !timeValue) return false;
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  if (dateValue !== today) return false;
  const [hours, minutes] = timeValue.split(":").map(Number);
  const delta = Math.abs((hours * 60 + minutes) - (now.getHours() * 60 + now.getMinutes()));
  return delta <= 2;
}

function syncSearchSummaries() {
  const date = $("#search-date")?.value || "";
  const time = $("#search-time")?.value || "";
  const mode = $('[data-mode].is-active')?.dataset.mode || "depart";
  const timingValue = $("#search-timing-value");
  const timingMode = $("#search-timing-mode");
  if (timingValue) timingValue.textContent = isNearNow(date, time) ? "現在時刻" : `${formatCompactDate(date)} ${time}`;
  if (timingMode) timingMode.textContent = mode === "arrive" ? "到着" : "出発";

  const conditionValue = $("#search-condition-value");
  const conditionParts = [];
  if ($("#direct-only")?.checked) conditionParts.push("直行");
  if ($("#round-trip")?.checked) conditionParts.push(`往復・${$("#stay-minutes")?.value || 60}分`);
  if (conditionValue) conditionValue.textContent = conditionParts.length ? conditionParts.join(" / ") : "指定なし";
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function sheetShell(id, kicker, title) {
  const dialog = document.createElement("dialog");
  dialog.id = id;
  dialog.className = "search-sheet";
  dialog.innerHTML = `
    <div class="search-sheet-shell">
      <div class="search-sheet-handle" aria-hidden="true"></div>
      <header class="search-sheet-head">
        <div><span>${kicker}</span><h3>${title}</h3></div>
        <button type="button" class="search-sheet-close" aria-label="閉じる">×</button>
      </header>
      <div class="search-sheet-body"></div>
      <button type="button" class="search-sheet-done">完了</button>
    </div>`;
  document.body.append(dialog);
  $(".search-sheet-close", dialog)?.addEventListener("click", () => closeDialog(dialog));
  $(".search-sheet-done", dialog)?.addEventListener("click", () => {
    syncSearchSummaries();
    closeDialog(dialog);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
  return dialog;
}

function setNow() {
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateInput = $("#search-date");
  const timeInput = $("#search-time");
  if (dateInput) {
    dateInput.value = date;
    dateInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (timeInput) {
    timeInput.value = time;
    timeInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
  $('[data-mode="depart"]')?.click();
  syncSearchSummaries();
}

function setupCompactSearchForm() {
  const form = $("#search-form");
  if (!form || form.dataset.v5Compact === "true") return;

  const routeEditor = $(".route-editor", form);
  const mode = $(".search-mode", form);
  const dateTime = $(".date-time-row", form);
  const options = $("#search-options");
  const submit = $(".search-submit", form);
  if (!routeEditor || !mode || !dateTime || !options || !submit) return;

  form.dataset.v5Compact = "true";

  const timingButton = document.createElement("button");
  timingButton.type = "button";
  timingButton.className = "search-summary-button search-timing-button";
  timingButton.innerHTML = `
    <span class="search-summary-icon" aria-hidden="true">◷</span>
    <span class="search-summary-main"><strong id="search-timing-value">現在時刻</strong><small>日時を指定</small></span>
    <span class="search-summary-value" id="search-timing-mode">出発</span>
    <span class="search-summary-chevron" aria-hidden="true">›</span>`;
  routeEditor.insertAdjacentElement("afterend", timingButton);

  const conditionButton = document.createElement("button");
  conditionButton.type = "button";
  conditionButton.className = "search-summary-button search-condition-button";
  conditionButton.innerHTML = `
    <span class="search-summary-icon" aria-hidden="true">☷</span>
    <span class="search-summary-main"><strong>検索条件</strong><small>直行・往復・滞在時間</small></span>
    <span class="search-summary-value" id="search-condition-value">指定なし</span>
    <span class="search-summary-chevron" aria-hidden="true">›</span>`;
  timingButton.insertAdjacentElement("afterend", conditionButton);

  const timingSheet = sheetShell("search-timing-sheet", "DATE & TIME", "日時指定");
  const timingBody = $(".search-sheet-body", timingSheet);
  const nowButton = document.createElement("button");
  nowButton.type = "button";
  nowButton.className = "search-now-choice";
  nowButton.innerHTML = '<span aria-hidden="true">◷</span><strong>現在時刻に戻す</strong>';
  nowButton.addEventListener("click", setNow);
  timingBody.append(nowButton, mode, dateTime);

  const conditionSheet = sheetShell("search-condition-sheet", "SEARCH OPTIONS", "検索条件");
  const conditionBody = $(".search-sheet-body", conditionSheet);
  options.open = true;
  conditionBody.append(options);

  timingButton.addEventListener("click", () => {
    syncSearchSummaries();
    openDialog(timingSheet);
  });
  conditionButton.addEventListener("click", () => {
    syncSearchSummaries();
    openDialog(conditionSheet);
  });

  ["#search-date", "#search-time", "#stay-minutes", "#direct-only", "#round-trip"].forEach((selector) => {
    $(selector)?.addEventListener("change", () => requestAnimationFrame(syncSearchSummaries));
  });
  $$("[data-mode]", timingSheet).forEach((button) => button.addEventListener("click", () => requestAnimationFrame(syncSearchSummaries)));
  syncSearchSummaries();
}

function markSearchCardMetadata() {
  $$("#search-results .journey-details").forEach((details) => {
    details.classList.add("journey-details-v5");
    const pills = $$(".pill", details);
    const routePill = pills.find((pill) => ["直行", "箕面経由"].includes(pill.textContent.trim()));
    const tripPill = pills.find((pill) => /^[EW]\d+便$/.test(pill.textContent.trim()));
    routePill?.classList.add("route-type-pill-v5");
    tripPill?.classList.add("trip-id-pill-v5");
  });
}

function normalizeTimetableCardOrder() {
  $$("#timetable-list .tt-compact-badges").forEach((badges) => badges.classList.add("tt-compact-badges-v5"));
}

function syncDynamicUi() {
  syncHeader();
  syncSearchSummaries();
  markSearchCardMetadata();
  normalizeTimetableCardOrder();
}

function observeSurface(root, callback, options = { childList: true, subtree: true }) {
  if (!root) return;
  const observer = new MutationObserver(callback);
  observer.observe(root, options);
  surfaceObservers.push(observer);
}

function observeUi() {
  observeSurface($("#search-results"), () => requestAnimationFrame(markSearchCardMetadata));
  observeSurface($("#timetable-list"), () => requestAnimationFrame(() => {
    normalizeTimetableCardOrder();
    syncStickyMetrics();
  }));
}

function bindNavigation() {
  $$(".bottom-nav [data-nav]").forEach((button) => button.addEventListener("click", () => requestAnimationFrame(syncDynamicUi)));
  window.addEventListener("handai:viewchange", () => requestAnimationFrame(syncDynamicUi));
  window.addEventListener("resize", syncStickyMetrics, { passive: true });
}

function init() {
  document.body.classList.add("ui-v5");
  installStyles();
  ensureServiceBannerAnchor();
  setupCompactSearchForm();
  bindNavigation();
  observeUi();
  requestAnimationFrame(syncDynamicUi);
  window.setTimeout(syncDynamicUi, 180);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
