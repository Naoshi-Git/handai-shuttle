import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [lifecycle, lifecycleCss, currentCss, preferences, core] = await Promise.all([
  read("src/view-lifecycle.mjs"),
  read("src/view-lifecycle.css"),
  read("src/ui-current.css"),
  read("src/route-preferences.mjs"),
  read("src/features-v3-core.mjs")
]);

test("timetable selection material stays below button text instead of washing it out", () => {
  assert.match(currentCss, /#timetable-route-controls::before,[\s\S]*z-index:\s*1/);
  assert.match(currentCss, /\.tt-campus-tabs > button,[\s\S]*z-index:\s*2 !important/);
  const trackBlock = currentCss.match(/body\.ui-current \.tt-campus-tabs,[\s\S]*?box-shadow:[^\n]+\n}/)?.[0] || "";
  assert.doesNotMatch(trackBlock, /z-index:\s*0/);
  assert.match(currentCss, /--current-control-selected-ink:\s*#111118/);
});

test("ordinary bottom tabs crossfade preloaded content without a white interstitial", () => {
  assert.match(lifecycle, /if \(view === "timetable"\) void revealTimetable\(id\);[\s\S]*else void crossfadeTo\(view, id\)/);
  assert.match(lifecycleCss, /view-crossfade-leaving/);
  assert.match(lifecycleCss, /view-crossfade-entering/);
  assert.doesNotMatch(lifecycleCss, /view-transition-veil/);
  assert.doesNotMatch(lifecycle, /startViewTransition|pointerdown/);
});

test("Bottom Nav is persistent shell chrome and is outside the crossfade layer", () => {
  assert.match(lifecycleCss, /\.bottom-nav[\s\S]*z-index:\s*60 !important/);
  assert.match(lifecycleCss, /body\.ui-view-lifecycle main[\s\S]*position:\s*relative/);
  assert.doesNotMatch(lifecycleCss, /\.bottom-nav[\s\S]{0,160}opacity:/);
});

test("Timetable alone gets a content loader while hidden route and scroll work settles", () => {
  assert.match(lifecycle, /revealTimetable/);
  assert.match(lifecycle, /waitForTimetableDomQuiet/);
  assert.match(lifecycle, /waitForScrollIdle/);
  assert.match(lifecycleCss, /timetable-transition-loader/);
  assert.match(lifecycleCss, /bottom:\s*calc\(76px \+ env\(safe-area-inset-bottom\)\)/);
});

test("Search and timetable defaults are prepared before tab entry rather than on handai:viewchange", () => {
  assert.match(preferences, /schedulePreparedViews/);
  assert.match(preferences, /observeHomeDestination/);
  assert.match(preferences, /schedulePreparedViews\(\);[\s\S]*}\n\nif \(typeof document/);
  assert.doesNotMatch(preferences, /addEventListener\("handai:viewchange"/);
  assert.match(core, /renderTimetableControls\(\);\s*renderRouteTimetable\(\);\s*timetableInitialized = true/);
});

test("lifecycle blocks legacy tab-entry listeners without click replay or stopImmediatePropagation", () => {
  assert.match(lifecycle, /event\.preventDefault\(\);\s*event\.stopPropagation\(\)/);
  assert.doesNotMatch(lifecycle, /stopImmediatePropagation|\.click\(\)/);
});
