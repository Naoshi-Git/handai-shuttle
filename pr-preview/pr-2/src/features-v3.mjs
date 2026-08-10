// Compatibility entry point kept because enhancements.mjs imports this path.
// Boot release is independent from all later compatibility layers so a runtime failure
// cannot leave the user trapped on the launch screen.
import "./boot-guard.mjs";
import "./features-v3-core.mjs";
import "./brand-integration.mjs";
import "./ui-v4.mjs";
import "./ads.mjs";
import "./ui-v5.mjs";
import "./pwa.mjs";
import "./ui-v6.mjs";
import "./ui-route-state.mjs";
import "./ui-v10.mjs";
import "./ui-v12.mjs";
import "./ui-v13.mjs";
import "./ui-runtime.mjs";
import "./ui-motion-v2.mjs";
