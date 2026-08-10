import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../src/features-v3.mjs", import.meta.url), "utf8");
const app = await readFile(new URL("../src/app.mjs", import.meta.url), "utf8");
const current = await readFile(new URL("../src/ui-current.mjs", import.meta.url), "utf8");
const currentCss = await readFile(new URL("../src/ui-current.css", import.meta.url), "utf8");
const preferences = await readFile(new URL("../src/route-preferences.mjs", import.meta.url), "utf8");

await import("../src/ui-current.mjs");
await import("../src/route-preferences.mjs");

test("active graph has one current interaction owner", () => {
  assert.match(entry, /import "\.\/route-preferences\.mjs";/);
  assert.match(entry, /import "\.\/ui-current\.mjs";/);
  assert.doesNotMatch(entry, /ui-v7-fixes/);
  assert.doesNotMatch(entry, /ui-v9\.mjs/);
  assert.doesNotMatch(entry, /ui-runtime\.mjs/);
  assert.doesNotMatch(entry, /ui-safe-fixes/);
});

test("route preferences contain state/default behavior but never render Home", () => {
  assert.match(preferences, /preferredSuitaOrigin/);
  assert.match(preferences, /preferredSuitaDestination/);
  assert.match(preferences, /syncSearchDefaults/);
  assert.match(preferences, /syncTimetableDefaults/);
  assert.doesNotMatch(preferences, /renderPreciseHome/);
  assert.doesNotMatch(preferences, /queuePreciseHome/);
  assert.doesNotMatch(preferences, /#next-card-content/);
});

test("base Home delegates to the current owner after enhancement startup", () => {
  assert.match(app, /typeof window\.__handaiCurrentRenderHome === "function"/);
  assert.match(app, /window\.__handaiCurrentRenderHome\(\)/);
  assert.match(current, /window\.__handaiCurrentRenderHome = \(\) => renderCurrentHome\(\)/);
});

test("base tab navigation never repaints the legacy timetable", () => {
  assert.doesNotMatch(app, /if \(view === "timetable"\) renderTimetable\(\)/);
  assert.match(app, /window\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
  assert.doesNotMatch(current, /activateTimetableView/);
});

test("Home selector labels stay campus-only while stop detail stays in content", () => {
  assert.match(current, /button\.textContent\.trim\(\) !== campus\.name/);
  assert.match(current, /endpointLabel\(originCampus, origin/);
  assert.match(current, /endpointLabel\(destinationCampus, destination/);
  assert.doesNotMatch(current, /data-home-destination="suita"[^\n]*工学部前/);
});

test("Home destination click is owned before the base target listener", () => {
  assert.match(current, /#home-destination-chips \[data-home-destination\]/);
  assert.match(current, /event\.stopPropagation\(\);[\s\S]*renderCurrentHome\(homeDestination\.dataset\.homeDestination/);
});

test("selection materials live on persistent parents instead of recreated child gliders", () => {
  assert.match(currentCss, /#home-destination-chips::before/);
  assert.match(currentCss, /#timetable-route-controls::before/);
  assert.match(currentCss, /#timetable-route-controls::after/);
  assert.doesNotMatch(current, /runtime-choice-glider/);
  assert.match(current, /nav\.prepend\(glider\)/);
  assert.match(currentCss, /\.tt-campus-tabs \{ grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(currentCss, /\.tt-destination-buttons \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
});

test("same nav and same segmented choice are true no-ops", () => {
  assert.match(current, /\.bottom-nav \[data-nav\]\.is-active/);
  assert.match(current, /event\.stopPropagation\(\)/);
  assert.match(current, /#home-destination-chips \[data-home-destination\]\.is-active/);
  assert.match(current, /\.tt-campus-tabs \[data-tt-origin\]\.is-active/);
  assert.match(current, /\.tt-destination-buttons \[data-tt-destination\]\.is-active/);
  assert.match(current, /\.search-mode \[data-mode\]\.is-active/);
});

test("motion grammar separates tab, selection and sheets", () => {
  assert.match(currentCss, /--current-motion-view:\s*300ms/);
  assert.match(currentCss, /--current-motion-choice:\s*280ms/);
  assert.match(currentCss, /--current-motion-sheet:\s*360ms/);
  assert.match(currentCss, /opacity:\s*\.72/);
  assert.match(currentCss, /translate3d\(0,1px,0\)/);
  assert.match(currentCss, /translate3d\(0,16px,0\)/);
  assert.doesNotMatch(current, /startViewTransition/);
});

test("destination track and selection use the same geometry", () => {
  assert.match(currentCss, /\.tt-destination-buttons[\s\S]*border-radius:\s*16px/);
  assert.match(currentCss, /\.tt-destination-buttons > button[\s\S]*border-radius:\s*12px/);
  assert.match(currentCss, /#timetable-route-controls::after[\s\S]*border-radius:\s*12px/);
  assert.match(currentCss, /background:\s*var\(--current-track\)/);
});

test("favorite normalization cannot self-trigger forever", () => {
  assert.match(current, /node\.textContent !== wanted\) node\.textContent = wanted/);
  assert.match(current, /subtitle\.textContent !== FAVORITE_SUBTITLE/);
  assert.doesNotMatch(current, /observe\(document\.body/);
});

test("utility behavior formerly in runtime is retained by current owner", () => {
  assert.match(current, /normalizeUtilityUi/);
  assert.match(current, /iconSvg\(name\)/);
  assert.match(current, /naturalWidth < 360/);
  assert.match(current, /"条件を保存"/);
  assert.match(current, /"次の便"/);
});

test("reduced motion remains explicit", () => {
  assert.match(currentCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(currentCss, /animation:\s*none !important/);
  assert.match(currentCss, /transition:\s*none !important/);
});
