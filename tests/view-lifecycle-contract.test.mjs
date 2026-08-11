import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [
  lifecycle,
  lifecycleCss,
  currentCss,
  preferences,
  core,
  html,
  uiV5,
  uiV5Css,
  uiV10Css,
  uiV11Css,
  uiV14Css,
  uiV15Css
] = await Promise.all([
  read("src/view-lifecycle.mjs"),
  read("src/view-lifecycle.css"),
  read("src/ui-current.css"),
  read("src/route-preferences.mjs"),
  read("src/features-v3-core.mjs"),
  read("index.html"),
  read("src/ui-v5.mjs"),
  read("ui-v5.css"),
  read("src/ui-v10.css"),
  read("src/ui-v11.css"),
  read("src/ui-v14.css"),
  read("src/ui-v15.css")
]);

test("timetable selection material stays below button text instead of washing it out", () => {
  assert.match(currentCss, /#timetable-route-controls::before,[\s\S]*z-index:\s*1/);
  assert.match(currentCss, /\.tt-campus-tabs > button,[\s\S]*z-index:\s*2 !important/);
  const trackBlock = currentCss.match(/body\.ui-current \.tt-campus-tabs,[\s\S]*?box-shadow:[^\n]+\n}/)?.[0] || "";
  assert.doesNotMatch(trackBlock, /z-index:\s*0/);
  assert.match(currentCss, /--current-control-selected-ink:\s*#111118/);
});

test("app topbar has one Japanese title line and no legacy eyebrow state", () => {
  assert.doesNotMatch(html, /class="eyebrow"/);
  assert.match(html, /<div class="brand-copy"><h1>阪大シャトル<\/h1><\/div>/);
  assert.doesNotMatch(uiV5, /\.topbar \.eyebrow|eyebrow\s*:/);
  assert.doesNotMatch(uiV5Css, /\.topbar \.eyebrow|data-active-view[^\n]*\.topbar/);
  assert.match(currentCss, /body\.ui-current \.topbar[\s\S]*min-height:\s*68px !important/);
  assert.match(currentCss, /body\.ui-current \.topbar \.brand-copy h1[\s\S]*margin:\s*0 !important[\s\S]*line-height:\s*1\.15 !important/);
});

test("legacy version CSS no longer owns the app Topbar or old view enter animation", () => {
  assert.doesNotMatch(uiV10Css, /body\.ui-v10 \.brand-copy h1/);
  assert.doesNotMatch(uiV11Css, /body\.ui-v11 \.topbar|body\.ui-v11 \.brand-copy h1/);
  assert.doesNotMatch(uiV14Css, /body\.ui-v14 \.topbar/);
  assert.doesNotMatch(uiV15Css, /body\.ui-v15 \.topbar|v15-view-enter/);
  assert.doesNotMatch(uiV5Css, /v6-view-enter/);
  assert.doesNotMatch(lifecycleCss, /ui-v6 \.view\.is-active|ui-v15 \.view\.is-active/);
});

test("ordinary bottom tabs dissolve preloaded content without a white interstitial", () => {
  assert.match(lifecycle, /if \(view === "timetable"\) void revealTimetable\(id\);[\s\S]*else void crossfadeTo\(view, id\)/);
  assert.match(lifecycleCss, /view-crossfade-leaving/);
  assert.match(lifecycleCss, /view-crossfade-entering/);
  assert.doesNotMatch(lifecycleCss, /view-transition-veil/);
  assert.doesNotMatch(lifecycle, /startViewTransition|pointerdown/);
});

test("outgoing screen is frozen to viewport coordinates before commit changes shared layout", () => {
  assert.match(lifecycle, /freezeOutgoingView\(outgoing\);[\s\S]*commitView\(view\)/);
  assert.match(lifecycle, /getBoundingClientRect\(\)/);
  assert.match(lifecycleCss, /\.view\.view-crossfade-leaving[\s\S]*position:\s*fixed !important/);
  assert.match(lifecycleCss, /top:\s*var\(--view-crossfade-top/);
  assert.match(lifecycleCss, /left:\s*var\(--view-crossfade-left/);
  assert.match(lifecycleCss, /width:\s*var\(--view-crossfade-width/);
  assert.match(lifecycleCss, /view-crossfade-leaving\[data-view="search"\][\s\S]*padding-top:\s*10px !important/);
});

test("dense screens use an asymmetric dissolve instead of a long 50-50 double exposure", () => {
  assert.match(lifecycleCss, /--view-dissolve-out:\s*145ms/);
  assert.match(lifecycleCss, /--view-dissolve-in:\s*185ms/);
  assert.match(lifecycleCss, /--view-dissolve-in-delay:\s*18ms/);
  assert.match(lifecycle, /crossfadeMs:\s*220/);
});

test("contextual header title dissolves while Bottom Nav stays persistent", () => {
  assert.match(lifecycle, /prepareHeaderTransition\(\)/);
  assert.match(lifecycle, /runHeaderTransition\(\)/);
  assert.match(lifecycleCss, /view-header-copy-ghost/);
  assert.match(lifecycleCss, /brand-copy\.view-header-copy-entering/);
  assert.match(lifecycleCss, /\.bottom-nav[\s\S]*z-index:\s*60 !important/);
  assert.doesNotMatch(lifecycleCss, /\.bottom-nav[\s\S]{0,160}opacity:/);
});

test("Search boundary preserves the moving shared service banner during dissolve", () => {
  assert.match(lifecycle, /prepareServiceBannerTransition\(fromView, view\)/);
  assert.match(lifecycle, /crossesSearchBoundary/);
  assert.match(lifecycle, /service-banner-transition-placeholder/);
  assert.match(lifecycleCss, /view-service-banner-ghost/);
  assert.match(lifecycleCss, /view-service-banner-entering/);
});

test("Timetable alone gets a content loader while hidden route and scroll work settles", () => {
  assert.match(lifecycle, /revealTimetable/);
  assert.match(lifecycle, /waitForTimetableDomQuiet/);
  assert.match(lifecycle, /waitForScrollIdle/);
  assert.match(lifecycleCss, /timetable-transition-loader/);
  assert.match(lifecycleCss, /bottom:\s*calc\(76px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(lifecycle, /prepareHeaderTransition\(\)/);
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
