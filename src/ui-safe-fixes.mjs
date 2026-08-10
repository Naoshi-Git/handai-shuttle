const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const FAVORITE_SUBTITLE = "タップすると保存した便を開きます";

function installStyles() {
  if ($("style[data-ui-safe-fixes]")) return;
  const style = document.createElement("style");
  style.dataset.uiSafeFixes = "true";
  style.textContent = `
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
        transform var(--runtime-motion-select, 280ms) var(--runtime-ease, cubic-bezier(.22,.72,.24,1)),
        opacity var(--runtime-motion-close, 170ms) ease !important;
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

function bindSelectionStability() {
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

function init() {
  document.body.classList.add("ui-safe-fixes");
  installStyles();
  normalizeFavoritePresentation();
  observeFavoritePresentation();
  bindSelectionStability();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
