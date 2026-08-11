// Compatibility entry point kept because enhancements.mjs imports this path.
// Functional modules have one explicit owner; CSS-only visual scopes are activated here.
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

if (typeof document !== "undefined") document.body?.classList.add("ui-v10");
