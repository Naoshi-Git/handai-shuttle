import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const source = await readFile(new URL("../src/ui-v13.mjs", import.meta.url), "utf8");
const v12 = await readFile(new URL("../src/ui-v12.mjs", import.meta.url), "utf8");
const pwa = await readFile(new URL("../src/pwa.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-system.css", import.meta.url), "utf8");

await import("../src/ui-v13.mjs");

test("v13 is loaded after v12 and before ui-current as a behavior layer", () => {
  assert.match(entry, /import "\.\/ui-v12\.mjs";[\s\S]*import "\.\/ui-v13\.mjs";[\s\S]*import "\.\/ui-current\.mjs";/);
  assert.doesNotMatch(css, /body\.ui-v13/);
  assert.doesNotMatch(source, /classList\.add\("ui-v13"\)|ui-v13\.css|function installStyles/);
});

test("timetable uses the current rounded grouped list instead of detached rows", () => {
  assert.match(source, /timetable-group-v13/);
  assert.match(css, /timetable-group-v13[\s\S]*border-radius:\s*var\(--ui-radius-group\) !important/);
  assert.match(css, /timetable-group-v13 > \.route-timetable-card,[\s\S]*border-radius:\s*0 !important/);
});

test("settings subpage is portaled to body and restores content after the transition", () => {
  assert.match(source, /settings-subpage-v13/);
  assert.match(source, /document\.body\.append\(panel\)/);
  assert.match(source, /style\.setProperty\("bottom", "calc\(var\(--ui-nav-height, 60px\) \+ 18px \+ env\(safe-area-inset-bottom\)\)", "important"\)/);
  assert.match(source, /transitionend/);
  assert.match(source, /SETTINGS_CLOSE_FALLBACK_MS = 340/);
  assert.match(source, /panel\.inert = true/);
  assert.match(source, /closeSettingsPanel\(\{ immediate: true \}\)/);
});

test("settings subpage closes on the same window lifecycle used by bottom navigation", () => {
  assert.match(source, /settingsViewIsActive\(\)/);
  assert.match(source, /window\.addEventListener\("click",[\s\S]*\.bottom-nav \[data-nav\]/);
  assert.match(source, /window\.addEventListener\("handai:viewchange"/);
  assert.match(source, /next !== "settings"\) closeSettingsPanel\(\{ immediate: true \}\)/);
  assert.match(source, /document\.querySelector\("\[data-pwa-install-nudge\]"\)\?\.remove\(\)/);
});

test("settings edge swipe remains bounded and does not steal carousel or form gestures", () => {
  assert.match(source, /installSwipeBack/);
  assert.match(source, /SWIPE_EDGE_BASE_PX = 96/);
  assert.match(source, /SWIPE_COMMIT_CAP_PX = 84/);
  assert.match(source, /data-install-guide-track/);
  assert.match(source, /translate3d\(calc\(-50% \+ \$\{Math\.min\(dx, panel\.clientWidth\)\}px\),0,0\)/);
  assert.match(source, /SWIPE_FAST_VELOCITY/);
  assert.match(css, /settings-subpage-v13[\s\S]*translateX\(calc\(-50% \+ 100%\)\)/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(css, /\.settings-subpage-v13\.is-swiping[\s\S]*transition:\s*none !important/);
});

test("v13 observes only the settings surface and only its active-view class", () => {
  assert.match(source, /settingsObserver\.observe\(settings, \{ childList: true, subtree: true, attributes: true, attributeFilter: \["class"\] \}\)/);
  assert.doesNotMatch(source, /observe\(document\.body/);
  assert.doesNotMatch(source, /attributeFilter:\s*\["class",\s*"open"\]/);
});

test("legacy saved routes UI is removed in favor of search conditions and favorite trips", () => {
  assert.match(source, /removeLegacySavedRoutesUi/);
  assert.match(source, /保存したルート/);
  assert.match(source, /saved-searches-v6/);
  assert.match(source, /favorite-trips-v6/);
});

test("install guide renders supplied screenshots without image probing or crop logic", () => {
  assert.match(v12, /INSTALL_GUIDE_SOURCES/);
  assert.match(v12, /ios-01-share\.webp/);
  assert.match(v12, /ios-02-add-home\.webp/);
  assert.match(v12, /ios-03-confirm\.webp/);
  assert.match(v12, /install-guide-phone-frame/);
  assert.match(v12, /install-guide-phone-screen/);
  assert.match(v12, /background-image:url/);
  assert.match(v12, /background-size:contain/);
  assert.doesNotMatch(v12, /new Image\(/);
  assert.match(pwa, /height:clamp\(238px,32dvh,300px\)!important/);
  assert.match(pwa, /aspect-ratio:9\/19\.5/);
});
