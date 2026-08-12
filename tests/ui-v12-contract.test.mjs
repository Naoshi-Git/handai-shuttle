import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const source = await readFile(new URL("../src/ui-v12.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../src/ui-system.css", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const pwa = await readFile(new URL("../src/pwa.mjs", import.meta.url), "utf8");

await import("../src/ui-v12.mjs");

test("v12 remains a functional layer before v13 and ui-current", () => {
  assert.match(entry, /import "\.\/route-preferences\.mjs";[\s\S]*import "\.\/ui-v12\.mjs";[\s\S]*import "\.\/ui-v13\.mjs";[\s\S]*import "\.\/ui-current\.mjs";/);
  assert.doesNotMatch(entry, /import "\.\/ui-v10\.mjs";/);
  assert.doesNotMatch(source, /classList\.add\("ui-v12"\)|ui-v12\.css/);
});

test("semantic presentation CSS is linked in head before modules run", () => {
  assert.match(html, /ui-v4\.css" data-ui-v4/);
  assert.match(html, /ads\.css" data-ads-ui/);
  assert.match(html, /ui-system\.css" data-ui-system/);
  assert.doesNotMatch(html, /data-ui-v1[0-6]|data-ui-current/);
  assert.doesNotMatch(html, /src\/ui-v10\.css|src\/ui-v11\.css|src\/ui-v12\.css|src\/ui-v13\.css|src\/ui-v14\.css|src\/ui-v15\.css|src\/ui-current\.css/);
  assert.match(html, /ui-system\.css" data-ui-system[\s\S]*<\/head>[\s\S]*<script type="module" src="\.\/src\/app\.mjs"/);
  assert.match(html, /class="app-boot"/);
  assert.match(html, /brand-icon-rounded\.svg/);
});

test("legacy refresh is hidden and critical boot layer prevents FOUC", () => {
  assert.match(css, /#refresh-button[\s\S]*display:\s*none/);
  assert.match(html, /<style id="boot-critical">[\s\S]*body\.app-booting \.app-shell\{opacity:0!important/);
  assert.match(source, /finishBoot\(\)/);
});

test("bottom navigation keeps the current fixed floating geometry", () => {
  assert.match(css, /\.bottom-nav \{[\s\S]*position:\s*fixed !important/);
  assert.match(css, /\.bottom-nav button \{[\s\S]*min-height:\s*48px !important/);
  assert.match(css, /min-width:\s*760px[\s\S]*max-height:\s*599px/);
  assert.match(css, /\.bottom-nav::after[\s\S]*display:\s*none !important/);
});

test("manual campus selection explicitly drives location status", () => {
  assert.match(source, /LOCATION_SOURCE_KEY/);
  assert.match(source, /data-campus-choice/);
  assert.match(source, /setManualLocationState/);
  assert.match(source, /dataset\.locationState = "manual"/);
});

test("timetable next-bus cue is stronger without a selected blue frame", () => {
  assert.match(source, /次の便/);
  assert.match(css, /\.route-timetable-card:focus-visible[\s\S]*outline:\s*0 !important/);
  assert.match(css, /\.is-next::before[\s\S]*width:\s*3px !important/);
});

test("timetable advertisements are integrated and lazy detail sheet gets a footer ad", () => {
  assert.match(css, /\.ad-slot-timetable-inline[\s\S]*margin:\s*0 !important/);
  assert.match(css, /\.ad-slot-timetable-header[\s\S]*margin:\s*0 !important/);
  assert.match(source, /ad-slot-timetable-detail/);
  assert.match(source, /ensureDetailAd/);
  assert.match(source, /bindDetailSheetLifecycle/);
  assert.match(source, /#timetable-list \[data-tt-trip\]/);
  assert.match(source, /window\.setTimeout\(observeDetailSheet, 0\)/);
});

test("settings use disclosures while favorites and searches remain visible", () => {
  assert.match(source, /settings-disclosure/);
  assert.match(source, /favorite-trips-v6/);
  assert.match(source, /saved-searches-v6/);
  assert.match(css, /\.settings-disclosure > summary/);
});

test("home-screen install guide renders the supplied screenshots inside the phone frames", () => {
  assert.match(source, /INSTALL_GUIDE_STEPS/);
  assert.match(source, /INSTALL_GUIDE_SOURCES/);
  for (const image of ["ios-01-share", "ios-02-add-home", "ios-03-confirm"]) {
    assert.match(source, new RegExp(`${image}\\.webp\\?guide=\\d+[a-z]?`));
  }
  assert.match(source, /install-guide-phone-frame/);
  assert.match(source, /install-guide-phone-screen/);
  assert.match(source, /background-image:url/);
  assert.match(source, /background-size:contain/);
  assert.doesNotMatch(source, /new Image\(/);
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  assert.match(pwa, /install-guide-media\{height:clamp\(238px,32dvh,300px\)!important/);
  assert.match(pwa, /install-guide-phone-frame/);
});

test("v12 observes only owned settings and timetable surfaces", () => {
  assert.match(source, /\$\("#view-settings"\)/);
  assert.match(source, /\$\("#timetable-list"\)/);
  assert.match(source, /dynamicObserver\.observe\(root, \{ childList: true, subtree: true \}\)/);
  assert.match(source, /detailSheetObserver\.observe\(dialog, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(source, /observe\(document\.body/);
  assert.doesNotMatch(source, /attributeFilter:\s*\["class", "open"\]/);
});
