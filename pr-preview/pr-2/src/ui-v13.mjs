const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const LEGACY_SAVED_ROUTES_ID = "saved-routes";
const SETTINGS_PANEL_ID = "settings-subpage-v13";
const SWIPE_EDGE_MAX_PX = 96;
const SWIPE_EDGE_RATIO = 0.24;
const SWIPE_LOCK_PX = 8;
const SWIPE_COMMIT_CAP_PX = 84;
const SWIPE_COMMIT_RATIO = 0.22;
const SWIPE_FAST_VELOCITY = 0.52;
const SWIPE_INTERACTIVE_SELECTOR = "button,a,input,select,textarea,[contenteditable='true'],[data-install-guide-track]";

let settingsOpenState = null;
let normalizeQueued = false;
let settingsObserver = null;

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
  panel.style.removeProperty("transform");
  panel.classList.remove("is-swiping");
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
  panel.classList.remove("is-swiping", "is-open");
  panel.style.removeProperty("transform");
  panel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("settings-subpage-open");
  const { card, placeholder } = settingsOpenState;
  settingsOpenState = null;
  window.setTimeout(() => {
    placeholder.parentNode?.insertBefore(card, placeholder);
    placeholder.remove();
  }, 220);
}

function isSwipeCandidate(panel, event) {
  if (!panel.classList.contains("is-open")) return false;
  if (event.pointerType && event.pointerType !== "touch" && event.pointerType !== "pen") return false;
  const edgeLimit = Math.max(SWIPE_EDGE_MAX_PX, panel.clientWidth * SWIPE_EDGE_RATIO);
  if (event.clientX > edgeLimit) return false;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(SWIPE_INTERACTIVE_SELECTOR)) return false;
  return true;
}

function installSwipeBack(panel) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let dx = 0;
  let dragging = false;

  const resetGesture = ({ settle = true } = {}) => {
    pointerId = null;
    dragging = false;
    dx = 0;
    panel.classList.remove("is-swiping");
    if (settle) panel.style.removeProperty("transform");
  };

  panel.addEventListener("pointerdown", (event) => {
    if (!isSwipeCandidate(panel, event)) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = performance.now();
    dx = 0;
    dragging = false;
    panel.setPointerCapture?.(pointerId);
  });

  panel.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    const nextX = Math.max(0, event.clientX - startX);
    const dy = Math.abs(event.clientY - startY);
    if (!dragging && nextX < SWIPE_LOCK_PX && dy < SWIPE_LOCK_PX) return;
    if (!dragging && dy > nextX) {
      panel.releasePointerCapture?.(pointerId);
      resetGesture();
      return;
    }
    if (nextX <= 0) return;

    dragging = true;
    dx = nextX;
    panel.classList.add("is-swiping");
    panel.style.transform = `translate3d(calc(-50% + ${Math.min(dx, panel.clientWidth)}px),0,0)`;
    if (event.cancelable) event.preventDefault();
  }, { passive: false });

  const finish = (event) => {
    if (pointerId !== event.pointerId) return;
    panel.releasePointerCapture?.(pointerId);
    const elapsed = Math.max(1, performance.now() - startTime);
    const velocity = dx / elapsed;
    const threshold = Math.min(SWIPE_COMMIT_CAP_PX, panel.clientWidth * SWIPE_COMMIT_RATIO);
    const shouldClose = dragging && (dx >= threshold || (dx >= 36 && velocity >= SWIPE_FAST_VELOCITY));

    if (shouldClose) {
      resetGesture({ settle: false });
      closeSettingsPanel();
      return;
    }
    resetGesture();
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
  document.getElementById("timetable-list")?.classList.add("timetable-group-v13");
}

function normalizeBootCopy() {
  const status = $(".app-boot-status");
  if (status && status.textContent.trim() !== "運行情報を読み込んでいます") status.textContent = "運行情報を読み込んでいます";
}

function normalizeSettingsUi() {
  buildSettingsRoot();
  normalizeInstallGuide();
}

function queueSettingsNormalization() {
  if (normalizeQueued) return;
  normalizeQueued = true;
  requestAnimationFrame(() => {
    normalizeQueued = false;
    normalizeSettingsUi();
  });
}

function observeSettingsUi() {
  const settings = document.getElementById("view-settings");
  if (!settings || settingsObserver) return;
  settingsObserver = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList")) queueSettingsNormalization();
  });
  settingsObserver.observe(settings, { childList: true, subtree: true });
}

function init() {
  document.body.classList.add("ui-v13");
  installStyles();
  normalizeBootCopy();
  normalizeTimetable();
  normalizeSettingsUi();
  observeSettingsUi();
  window.setTimeout(queueSettingsNormalization, 260);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
