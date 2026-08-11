// Compatibility entry point kept because enhancements.mjs imports this path.
// Functional modules keep their behavior ownership; presentation has one semantic CSS scope.
import "./features-v3-core.mjs";
import "./brand-integration.mjs";
import "./ui-v4.mjs";
import "./ads.mjs";
import "./ui-v5.mjs";
import "./pwa.mjs";
import "./ui-v6.mjs";
import "./route-preferences.mjs";
import "./ui-v12.mjs";
import "./ui-v13.mjs";
import "./view-lifecycle.mjs";
import "./ui-current.mjs";

const LEGACY_PRESENTATION_SCOPES = [
  "ui-v10",
  "ui-v11",
  "ui-v12",
  "ui-v13",
  "ui-v14",
  "ui-v15",
  "ui-v16",
  "ui-current"
];

function normalizePresentationScope() {
  const body = document.body;
  if (!body) return;
  body.classList.add("ui-system");
  body.classList.remove(...LEGACY_PRESENTATION_SCOPES);
}

if (typeof document !== "undefined") {
  normalizePresentationScope();
  if (document.readyState === "loading") {
    // Imported modules register their DOMContentLoaded handlers first. Normalize once more
    // after those legacy behavior modules initialize so version scopes cannot leak back in.
    document.addEventListener("DOMContentLoaded", normalizePresentationScope, { once: true });
  }
}
