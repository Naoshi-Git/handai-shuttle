const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const FAVORITE_SUBTITLE = "タップすると保存した便を開きます";
let maskedHomeButton = null;
let maskedHomeDestination = "";

function installStyles() {
  if ($("style[data-ui-safe-fixes]")) return;
  const style = document.createElement("style");
  style.dataset.uiSafeFixes = "true";
  style.textContent = `
    :root {
      --safe-page-gutter: 18px;
    }

    body.ui-safe-fixes .topbar {
      padding-left: var(--safe-page-gutter) !important;
      padding-right: var(--safe-page-gutter) !important;
    }

    body.ui-safe-fixes .view {
      padding-left: var(--safe-page-gutter) !important;
      padding-right: var(--safe-page-gutter) !important;
    }

    body.ui-safe-fixes .service-banner {
      margin-left: var(--safe-page-gutter) !important;
      margin-right: var(--safe-page-gutter) !important;
    }

    body.ui-safe-fixes #view-search .results-section > .section-title-row {
      padding-left: 4px !important;
      padding-right: 4px !important;
      gap: 10px !important;
    }

    body.ui-safe-fixes #view-search .results-section > .section-title-row > div {
      min-width: 0;
    }

    body.ui-safe-fixes #results-title {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    body.ui-safe-fixes .search-sheet-shell,
    body.ui-safe-fixes .tt-sheet-shell {
      padding-left: var(--safe-page-gutter) !important;
      padding-right: var(--safe-page-gutter) !important;
    }

    body.ui-safe-fixes .brand-mark[role="button"] {
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: opacity 140ms ease !important;
    }

    body.ui-safe-fixes .brand-mark[role="button"]:active {
      opacity: .76;
      transform: none !important;
    }

    body.ui-safe-fixes .view.is-active {
      animation: safe-view-enter 220ms cubic-bezier(.2,.65,.25,1) both !important;
    }

    @keyframes safe-view-enter {
      from { opacity: .88; transform: translate3d(0, 2px, 0); }
      to { opacity: 1; transform: none; }
    }

    body.ui-safe-fixes .search-sheet[open],
    body.ui-safe-fixes .tt-detail-sheet[open],
    body.ui-safe-fixes .share-card-dialog[open] {
      animation: safe-sheet-enter 340ms cubic-bezier(.16,1,.3,1) both !important;
    }

    body.ui-safe-fixes .campus-dialog[open] {
      animation: safe-dialog-enter 290ms cubic-bezier(.16,1,.3,1) both !important;
    }

    body.ui-safe-fixes dialog[open]::backdrop {
      animation: safe-backdrop-enter 260ms ease both !important;
    }

    @keyframes safe-sheet-enter {
      from { opacity: 0; transform: translate3d(0, 14px, 0); }
      to { opacity: 1; transform: none; }
    }

    @keyframes safe-dialog-enter {
      from { opacity: 0; transform: translate3d(0, 3px, 0); }
      to { opacity: 1; transform: none; }
    }

    @keyframes safe-backdrop-enter {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    body.ui-safe-fixes .route-role.is-origin,
    body.ui-safe-fixes .route-role.is-destination {
      justify-content: center !important;
      text-align: center !important;
      padding-left: 10px !important;
      padding-right: 10px !important;
    }

    body.ui-safe-fixes .runtime-choice-track .runtime-choice-glider {
      box-sizing: border-box !important;
      border: 0 !important;
      transform: translate3d(
        var(--runtime-choice-x, 0px),
        calc(var(--runtime-choice-y, 0px) - 1px),
        0
      ) !important;
      transition:
        transform 240ms cubic-bezier(.25,.1,.25,1),
        opacity 180ms ease !important;
    }

    body.ui-safe-fixes .runtime-choice-track > button:active {
      transform: none !important;
    }

    body.ui-safe-fixes #home-destination-chips.runtime-choice-track,
    body.ui-safe-fixes .tt-destination-buttons.runtime-choice-track,
    body.ui-safe-fixes .search-mode.runtime-choice-track {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    body.ui-safe-fixes .tt-campus-tabs.runtime-choice-track {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }

    body.ui-safe-fixes #home-destination-chips.runtime-choice-track > button,
    body.ui-safe-fixes .tt-campus-tabs.runtime-choice-track > button,
    body.ui-safe-fixes .tt-destination-buttons.runtime-choice-track > button,
    body.ui-safe-fixes .search-mode.runtime-choice-track > button {
      width: 100% !important;
      min-width: 0 !important;
    }

    body.ui-safe-fixes.runtime-freeze-tt-origin .tt-campus-tabs .runtime-choice-glider,
    body.ui-safe-fixes.runtime-freeze-tt-destination .tt-destination-buttons .runtime-choice-glider {
      transition: none !important;
    }

    body.ui-safe-fixes.runtime-dom-swap #next-card,
    body.ui-safe-fixes.runtime-dom-swap #next-card-content,
    body.ui-safe-fixes.runtime-dom-swap #upcoming-list,
    body.ui-safe-fixes.runtime-dom-swap #home-destination-chips > button {
      animation: none !important;
      transition-property: none !important;
    }

    @media (max-width: 380px) {
      body.ui-safe-fixes .search-sheet-shell,
      body.ui-safe-fixes .tt-sheet-shell {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      body.ui-safe-fixes .view.is-active,
      body.ui-safe-fixes .search-sheet[open],
      body.ui-safe-fixes .tt-detail-sheet[open],
      body.ui-safe-fixes .share-card-dialog[open],
      body.ui-safe-fixes .campus-dialog[open],
      body.ui-safe-fixes dialog[open]::backdrop {
        animation: none !important;
      }
      body.ui-safe-fixes .runtime-choice-track .runtime-choice-glider,
      body.ui-safe-fixes .brand-mark[role="button"] {
        transition: none !important;
      }
    }
  `;
  document.head.append(style);
}

function normalizeFavoritePresentation() {
  const section = $("#favorite-trips-v6");
  if (!section) return;

  const subtitle = $(".compact-settings-head p", section);
  if (subtitle && subtitle.textContent !== FAVORITE_SUBTITLE) {
    subtitle.textContent = FAVORITE_SUBTITLE;
  }

  $$(".favorite-saved-row em", section).forEach((node) => {
    const tripId = node.textContent.trim().replace(/便+$/u, "");
    const wanted = tripId ? `${tripId}便` : "";
    if (wanted && node.textContent !== wanted) node.textContent = wanted;
  });
}

function observeFavoritePresentation() {
  const section = $("#favorite-trips-v6");
  if (!section) return;

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      normalizeFavoritePresentation();
    });
  });

  observer.observe(section, { childList: true, subtree: true, characterData: true });
}

function clearInteractionClasses() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.remove(
      "runtime-freeze-tt-origin",
      "runtime-freeze-tt-destination",
      "runtime-dom-swap"
    );
  }));
}

function redundantSelectionButton(target) {
  return target.closest?.([
    "#home-destination-chips [data-home-destination].is-active",
    ".tt-campus-tabs [data-tt-origin].is-active",
    ".tt-destination-buttons [data-tt-destination].is-active",
    ".search-mode [data-mode].is-active"
  ].join(","));
}

function maskLegacyHomeDelay(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  if (redundantSelectionButton(target)) {
    event.stopPropagation();
    return;
  }

  const homeButton = target.closest("#home-destination-chips [data-home-destination]");
  if (!homeButton) return;

  // ui-v9 listens on document capture and schedules a second Home render ~30 ms later.
  // Hide only its identifying attribute while the event travels through document capture.
  // The attribute is restored before target/bubble listeners, so the established base app
  // and enhancements handlers still receive the click normally.
  maskedHomeButton = homeButton;
  maskedHomeDestination = homeButton.dataset.homeDestination || "";
  homeButton.removeAttribute("data-home-destination");
  document.body.classList.add("runtime-dom-swap");
}

function restoreHomeDestinationMarker() {
  if (!maskedHomeButton) return;
  if (maskedHomeDestination) maskedHomeButton.dataset.homeDestination = maskedHomeDestination;
  maskedHomeButton = null;
  maskedHomeDestination = "";
}

function bindSelectionStability() {
  window.addEventListener("click", maskLegacyHomeDelay, true);

  // Registered after the legacy document-capture listeners on purpose. This restores the
  // Home marker after ui-v9/runtime have passed, but before the event reaches the button.
  document.addEventListener("click", restoreHomeDestinationMarker, true);

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest(".tt-destination-buttons [data-tt-destination]")) {
      document.body.classList.add("runtime-freeze-tt-origin");
      clearInteractionClasses();
      return;
    }

    if (target.closest(".tt-campus-tabs [data-tt-origin]")) {
      document.body.classList.add("runtime-freeze-tt-destination");
      clearInteractionClasses();
      return;
    }

    if (target.closest("#home-destination-chips [data-home-destination]")) {
      document.body.classList.add("runtime-dom-swap");
      clearInteractionClasses();
    }
  }, true);
}

function bindBrandHome() {
  const mark = $(".topbar .brand-mark");
  if (!mark || mark.dataset.homeBound === "true") return;
  mark.dataset.homeBound = "true";
  mark.setAttribute("role", "button");
  mark.setAttribute("tabindex", "0");
  mark.setAttribute("aria-label", "ホームへ戻る");
  mark.setAttribute("title", "ホームへ戻る");

  const goHome = () => {
    if ($("#view-home")?.classList.contains("is-active")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    $(".bottom-nav [data-nav='home']")?.click();
  };

  mark.addEventListener("click", goHome);
  mark.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.key === " ") event.preventDefault();
    goHome();
  });
}

function init() {
  document.body.classList.add("ui-safe-fixes");
  installStyles();
  normalizeFavoritePresentation();
  observeFavoritePresentation();
  bindSelectionStability();
  bindBrandHome();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
