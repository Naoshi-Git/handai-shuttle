const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const LEGACY_SAVED_ROUTES_ID = "saved-routes";
const SETTINGS_PANEL_ID = "settings-subpage-v13";
let settingsOpenState = null;
let normalizeQueued = false;

function installStyles() {
  if ($('link[data-ui-v13]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/ui-v13.css";
  link.dataset.uiV13 = "true";
  document.head.append(link);
}

function removeLegacySavedRoutesUi() {
  const legacyList = document.getElementById(LEGACY_SAVED_ROUTES_ID);
  const legacyCard = legacyList?.closest(".settings-card, .settings-disclosure");
  legacyCard?.remove();

  $$("#view-settings .settings-card, #view-settings .settings-disclosure").forEach((node) => {
    const heading = $("h3", node)?.textContent?.trim() || $("summary strong", node)?.textContent?.trim() || "";
    if (heading === "保存したルート") node.remove();
  });
}

function settingsMeta(details) {
  const strong = $(".settings-disclosure-title strong", details)?.textContent?.trim() || $("summary strong", details)?.textContent?.trim() || "設定";
  const small = $(".settings-disclosure-title small", details)?.textContent?.trim() || "タップして設定";
  return { title: strong, subtitle: small };
}

function iconChevron() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
}

function createSettingsPanel() {
  let panel = document.getElementById(SETTINGS_PANEL_ID);
  if (panel) return panel;
  panel = document.createElement("section");
  panel.id = SETTINGS_PANEL_ID;
  panel.className = "settings-subpage-v13";
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `
    <div class="settings-subpage-header">
      <button type="button" class="settings-subpage-back" aria-label="設定一覧に戻る">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>
      </button>
      <h2 data-settings-subpage-title>設定</h2>
      <span class="settings-subpage-spacer" aria-hidden="true"></span>
    </div>
    <div class="settings-subpage-body" data-settings-subpage-body></div>`;
  document.querySelector(".app-shell")?.append(panel);
  $(".settings-subpage-back", panel)?.addEventListener("click", closeSettingsPanel);
  installSwipeBack(panel);
  return panel;
}

function openSettingsPanel(details) {
  if (!details || settingsOpenState) return;
  const card = $(".settings-card", details);
  if (!card) return;
  const meta = settingsMeta(details);
  const panel = createSettingsPanel();
  const body = $("[data-settings-subpage-body]", panel);
  const title = $("[data-settings-subpage-title]", panel);
  const placeholder = document.createComment("settings-card-v13-placeholder");
  card.before(placeholder);
  body.replaceChildren(card);
  title.textContent = meta.title;
  settingsOpenState = { details, card, placeholder };
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("settings-subpage-open");

  if (card.matches("[data-pwa-settings]")) {
    $(".pwa-install-guide", card)?.classList.add("is-open");
  }

  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add("is-open")));
}

function closeSettingsPanel() {
  const panel = document.getElementById(SETTINGS_PANEL_ID);
  if (!panel || !settingsOpenState) return;
  panel.classList.remove("is-open");
  panel.style.removeProperty("transform");
  panel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("settings-subpage-open");
  const { card, placeholder } = settingsOpenState;
  settingsOpenState = null;
  window.setTimeout(() => {
    placeholder.parentNode?.insertBefore(card, placeholder);
    placeholder.remove();
  }, 210);
}

function installSwipeBack(panel) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let dragging = false;

  panel.addEventListener("pointerdown", (event) => {
    if (!panel.classList.contains("is-open")) return;
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    if (event.clientX > 52) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dx = 0;
    dragging = false;
    panel.setPointerCapture?.(pointerId);
  });

  panel.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    const nextX = Math.max(0, event.clientX - startX);
    const dy = Math.abs(event.clientY - startY);
    if (!dragging && nextX < 8) return;
    if (!dragging && dy > nextX) {
      pointerId = null;
      return;
    }
    dragging = true;
    dx = nextX;
    panel.style.transition = "none";
    panel.style.transform = `translateX(${Math.min(dx, panel.clientWidth)}px)`;
  });

  const finish = (event) => {
    if (pointerId !== event.pointerId) return;
    panel.releasePointerCapture?.(pointerId);
    pointerId = null;
    panel.style.removeProperty("transition");
    if (dragging && dx > Math.min(92, panel.clientWidth * 0.22)) {
      closeSettingsPanel();
    } else {
      panel.style.removeProperty("transform");
    }
    dragging = false;
    dx = 0;
  };
  panel.addEventListener("pointerup", finish);
  panel.addEventListener("pointercancel", finish);
}

function buildSettingsRoot() {
  const settings = document.getElementById("view-settings");
  if (!settings) return;
  removeLegacySavedRoutesUi();

  let menu = document.getElementById("settings-menu-v13");
  if (!menu) {
    menu = document.createElement("section");
    menu.id = "settings-menu-v13";
    menu.className = "settings-menu-v13";
    const searches = document.getElementById("saved-searches-v6");
    const favorites = document.getElementById("favorite-trips-v6");
    const anchor = searches || favorites || $(".page-heading", settings);
    anchor?.insertAdjacentElement("afterend", menu);
  }

  const disclosures = $$("#view-settings > .settings-disclosure").filter((details) => details.dataset.v13MenuBound !== "true");
  disclosures.forEach((details, index) => {
    details.dataset.v13MenuBound = "true";
    details.open = false;
    const meta = settingsMeta(details);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-nav-row-v13";
    button.dataset.settingsTarget = `settings-v13-${index}-${Date.now()}`;
    button.innerHTML = `<span><strong>${meta.title}</strong><small>${meta.subtitle}</small></span><span class="settings-nav-chevron-v13">${iconChevron()}</span>`;
    button.addEventListener("click", () => openSettingsPanel(details));
    menu.append(button);
    details.hidden = true;
  });
}

function normalizeInstallGuide() {
  const guide = $("[data-pwa-settings] .pwa-install-guide");
  if (!guide) return;
  const track = $(".install-guide-track", guide);
  if (track) track.setAttribute("aria-label", "iPhoneでホーム画面に追加する手順");
}

function normalizeTimetable() {
  const list = document.getElementById("timetable-list");
  if (list) list.classList.add("timetable-group-v13");
}

function normalizeBootCopy() {
  const status = $(".app-boot-status");
  if (status && status.textContent.trim() !== "運行情報を読み込んでいます") status.textContent = "運行情報を読み込んでいます";
}

function normalizeUi() {
  if (normalizeQueued) return;
  normalizeQueued = true;
  queueMicrotask(() => {
    normalizeQueued = false;
    buildSettingsRoot();
    normalizeInstallGuide();
    normalizeTimetable();
    normalizeBootCopy();
  });
}

function observeDynamicUi() {
  // Only settings structure can introduce new disclosure cards after initialization.
  // Timetable grouping is class-only and does not need to observe every body insertion.
  const settings = document.getElementById("view-settings");
  if (!settings) return;
  const observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" && record.addedNodes.length)) normalizeUi();
  });
  observer.observe(settings, { childList: true });
}

function init() {
  document.body.classList.add("ui-v13");
  installStyles();
  normalizeUi();
  observeDynamicUi();
  window.setTimeout(normalizeUi, 180);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
