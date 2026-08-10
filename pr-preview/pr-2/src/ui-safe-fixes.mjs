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

function init() {
  document.body.classList.add("ui-safe-fixes");
  installStyles();
  normalizeFavoritePresentation();
  observeFavoritePresentation();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
